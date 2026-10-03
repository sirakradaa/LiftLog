import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ActionMenu, type MenuSpec } from '@/components/ActionMenu';
import { DateTimeField } from '@/components/DateTimeField';
import { NumberInput } from '@/components/NumberInput';
import { WorkoutEditor, formatSet } from '@/components/WorkoutEditor';
import { Button, Card, H2, IconButton, Input, Row, T, styles } from '@/components/ui';
import { estimateCalories, estimate1RM } from '@/lib/calc';
import { beginWorkout } from '@/lib/start';
import { fmtDateTime, fmtDuration, fmtDurationShort, fmtNum, fmtWeight, parseNumber, toDisplayDistance, toDisplayWeight, distanceUnit } from '@/lib/units';
import { exerciseName, useExercises } from '@/repo/exercises';
import { latestMeasurement } from '@/repo/measurements';
import { saveTemplate } from '@/repo/templates';
import { copyExercises, deleteWorkout, getWorkout, saveWorkout, workoutPRs, workoutVolume, type PersonalRecord } from '@/repo/workouts';
import { useSettings } from '@/store/settings';
import { colors, space } from '@/theme';
import type { Field, Unit, WorkoutRecord } from '@/types';

function blankWorkout(): WorkoutRecord {
  const startedAt = Date.now() - 60 * 60 * 1000;
  return { id: '', name: 'Workout', notes: '', startedAt, endedAt: startedAt + 3600_000, durationSec: 3600, templateId: null, exercises: [] };
}

const PR_LABEL: Record<PersonalRecord['kind'], string> = {
  weight: 'Heaviest weight',
  e1rm: 'Best est. 1RM',
  setVolume: 'Best set volume',
  reps: 'Most reps',
  duration: 'Longest duration',
  distance: 'Longest distance',
};

function formatPR(pr: PersonalRecord, unit: Unit): string {
  if (pr.kind === 'duration') return fmtDuration(pr.value);
  if (pr.kind === 'distance') return `${fmtNum(toDisplayDistance(pr.value, unit))} ${distanceUnit(unit)}`;
  if (pr.kind === 'reps') return String(pr.value);
  return fmtWeight(pr.value, unit);
}

export default function WorkoutDetailScreen() {
  const { id, summary } = useLocalSearchParams<{ id: string; summary?: string }>();
  const isNew = id === 'new';
  const unit = useSettings((s) => s.unit);
  const byId = useExercises((s) => s.byId);
  const [version, setVersion] = useState(0);
  const workout = useMemo(() => (isNew ? null : getWorkout(id)), [id, isNew, version]);
  const [editing, setEditing] = useState<WorkoutRecord | null>(isNew ? blankWorkout() : null);
  const [menu, setMenu] = useState<MenuSpec | null>(null);

  const prs = useMemo(() => (workout ? workoutPRs(workout) : []), [workout]);
  const bodyweight = useMemo(() => latestMeasurement('bodyweight'), []);

  if (!workout && !editing) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <T dim>Workout not found.</T>
      </View>
    );
  }

  if (editing) {
    const save = () => {
      const exercises = editing.exercises.filter((e) => e.sets.length > 0);
      const newId = saveWorkout({
        id: isNew ? null : editing.id,
        name: editing.name,
        notes: editing.notes,
        startedAt: editing.startedAt,
        endedAt: editing.startedAt + editing.durationSec * 1000,
        durationSec: editing.durationSec,
        templateId: editing.templateId,
        exercises,
      });
      if (isNew) router.replace(`/workout/${newId}`);
      else {
        setEditing(null);
        setVersion((v) => v + 1);
      }
    };
    return (
      <View style={styles.screen}>
        <Stack.Screen
          options={{
            title: isNew ? 'Log past workout' : 'Edit workout',
            headerRight: () => <Button title="Save" small onPress={save} />,
          }}
        />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Input label="Name" value={editing.name} onChangeText={(name) => setEditing({ ...editing, name })} />
          <DateTimeField label="Started" value={editing.startedAt} onChange={(startedAt) => setEditing({ ...editing, startedAt })} />
          <View style={{ marginBottom: space.md }}>
            <T dim size={13} style={{ marginBottom: 4 }}>Duration (minutes)</T>
            <NumberInput
              value={Math.round(editing.durationSec / 60)}
              onChange={(m) => setEditing({ ...editing, durationSec: (m ?? 0) * 60 })}
              parse={parseNumber}
              format={(v) => String(v)}
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>
          <Input label="Notes" value={editing.notes} onChangeText={(notes) => setEditing({ ...editing, notes })} multiline />
          <WorkoutEditor
            draft={editing}
            onChange={(d) => setEditing({ ...editing, ...d })}
            mode="edit"
            excludeWorkoutId={isNew ? null : editing.id}
          />
          {!isNew && <Button title="Discard changes" variant="secondary" onPress={() => setEditing(null)} style={{ marginTop: space.lg }} />}
        </ScrollView>
      </View>
    );
  }

  const w = workout!;
  const volume = workoutVolume(w.exercises);
  const kcal = bodyweight ? estimateCalories(bodyweight.value, w.durationSec) : null;

  const openMenu = () =>
    setMenu({
      items: [
        { label: 'Edit workout', icon: 'create-outline', onPress: () => setEditing(JSON.parse(JSON.stringify(w)) as WorkoutRecord) },
        {
          label: 'Resume / continue this workout',
          icon: 'play',
          onPress: () =>
            beginWorkout({
              name: w.name,
              notes: w.notes,
              exercises: w.exercises,
              templateId: w.templateId,
              workoutId: w.id,
              startedAt: w.startedAt,
              elapsedSec: w.durationSec,
            }),
        },
        {
          label: 'Repeat as a new workout',
          icon: 'repeat',
          onPress: () => beginWorkout({ name: w.name, exercises: copyExercises(w.exercises), templateId: w.templateId }),
        },
        {
          label: 'Save as template',
          icon: 'bookmark-outline',
          onPress: () => {
            const tid = saveTemplate({ name: w.name, folder: '', notes: w.notes, exercises: copyExercises(w.exercises) });
            Alert.alert('Template saved', `"${w.name}" is now in your templates.`, [
              { text: 'OK' },
              { text: 'Edit it', onPress: () => router.push(`/template/${tid}`) },
            ]);
          },
        },
        {
          label: 'Delete workout',
          icon: 'trash-outline',
          destructive: true,
          onPress: () =>
            Alert.alert('Delete workout?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  deleteWorkout(w.id);
                  router.back();
                },
              },
            ]),
        },
      ],
    });

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: summary ? 'Workout complete' : 'Workout',
          headerRight: () => <IconButton name="ellipsis-horizontal" onPress={openMenu} />,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {summary ? <T size={28} style={{ textAlign: 'center', marginBottom: space.sm }}>🎉 Nice work!</T> : null}
        <T bold size={22}>{w.name}</T>
        <T faint size={13} style={{ marginBottom: space.md }}>{fmtDateTime(w.startedAt)}</T>
        <Row style={{ gap: space.md, marginBottom: space.md }}>
          <Stat label="Duration" value={fmtDurationShort(w.durationSec)} />
          <Stat label="Volume" value={`${fmtNum(toDisplayWeight(volume, unit), 0)} ${unit}`} />
          <Stat label="PRs" value={String(prs.length)} />
        </Row>
        {kcal != null && <T faint size={12} style={{ marginBottom: space.md }}>≈ {Math.round(kcal)} kcal (estimate from bodyweight and duration)</T>}
        {w.notes ? <Card><T dim>{w.notes}</T></Card> : null}

        {prs.length > 0 && (
          <Card style={{ borderColor: colors.gold, borderWidth: 1 }}>
            <H2>🏆 Personal records</H2>
            {prs.map((pr, i) => (
              <T key={i} size={14} style={{ marginBottom: 2 }}>
                {exerciseName(pr.exerciseId)} — {PR_LABEL[pr.kind]}: <T bold size={14}>{formatPR(pr, unit)}</T>
              </T>
            ))}
          </Card>
        )}

        {w.exercises.map((e) => {
          const ex = byId[e.exerciseId];
          const fields: Field[] = ex?.fields ?? ['weight', 'reps'];
          return (
            <Card key={e.id}>
              <T bold style={{ color: colors.primary, marginBottom: 4 }} >{ex?.name ?? 'Unknown exercise'}</T>
              {e.notes ? <T faint size={12} style={{ marginBottom: 4 }}>{e.notes}</T> : null}
              {e.sets.map((s, i) => (
                <Row key={s.id} style={{ justifyContent: 'space-between', paddingVertical: 2 }}>
                  <T dim size={14}>
                    {s.type === 'warmup' ? 'W' : s.type === 'drop' ? 'D' : s.type === 'failure' ? 'F' : i + 1}  {formatSet(s, fields, unit)}
                  </T>
                  {s.weight && s.reps ? <T faint size={12}>1RM {fmtWeight(estimate1RM(s.weight, s.reps), unit)}</T> : null}
                </Row>
              ))}
            </Card>
          );
        })}
        {summary ? <Button title="Done" onPress={() => router.replace('/history')} style={{ marginTop: space.md }} /> : null}
      </ScrollView>
      <ActionMenu spec={menu} onClose={() => setMenu(null)} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', marginBottom: 0, padding: space.md }}>
      <T bold size={17}>{value}</T>
      <T dim size={11}>{label}</T>
    </Card>
  );
}
