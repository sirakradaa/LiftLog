import React, { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ExercisePicker } from '@/components/ExercisePicker';
import { Button, Chip, ChipRow, H2, Input, T, styles } from '@/components/ui';
import { BODY_PARTS, EQUIPMENT, FIELD_LABELS, PATTERNS } from '@/data/exercises';
import { uid } from '@/lib/id';
import { fmtDuration } from '@/lib/units';
import {
  deleteExercise,
  exerciseName,
  exerciseUsage,
  findExerciseByName,
  getExercise,
  mergeExercise,
  saveExercise,
  swapRepsAndDuration,
} from '@/repo/exercises';
import { space } from '@/theme';
import type { Exercise, Field } from '@/types';

const ALL_FIELDS: Field[] = ['weight', 'reps', 'duration', 'distance'];
const REST_OPTIONS: (number | null)[] = [null, 0, 30, 60, 90, 120, 180, 240, 300];

export default function ExerciseEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = id ? getExercise(id) : undefined;
  const [e, setE] = useState<Exercise>(
    () =>
      existing ?? {
        id: uid(),
        name: '',
        bodyPart: 'Other',
        pattern: 'Other',
        equipment: 'Other',
        fields: ['weight', 'reps'],
        isCustom: true,
        hidden: false,
        notes: '',
        restSeconds: null,
      },
  );
  const [merging, setMerging] = useState(false);

  const save = () => {
    if (!e.name.trim()) return Alert.alert('Name required');
    if (!e.fields.length) return Alert.alert('Pick at least one thing to track');
    const clash = findExerciseByName(e.name);
    if (clash && clash.id !== e.id) return Alert.alert('Name already used', `"${clash.name}" already exists.`);
    saveExercise(e);
    router.back();
  };

  const toggleField = (f: Field) =>
    setE({ ...e, fields: e.fields.includes(f) ? e.fields.filter((x) => x !== f) : ALL_FIELDS.filter((x) => x === f || e.fields.includes(x)) });

  const tryDelete = () => {
    const usage = exerciseUsage(e.id);
    if (usage.workouts || usage.templates) {
      Alert.alert(
        'Exercise in use',
        `Used in ${usage.workouts} workout(s) and ${usage.templates} template(s). Hide it, or merge it into another exercise instead.`,
      );
      return;
    }
    Alert.alert('Delete exercise?', e.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteExercise(e.id);
          router.dismiss(2);
        },
      },
    ]);
  };

  const onMerge = (ids: string[]) => {
    setMerging(false);
    const target = ids[0];
    if (!target) return;
    Alert.alert('Merge exercise?', `All history and templates for "${e.name}" will move to "${exerciseName(target)}", and "${e.name}" will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Merge',
        style: 'destructive',
        onPress: () => {
          mergeExercise(e.id, target);
          router.dismiss(2);
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: existing ? 'Edit exercise' : 'New exercise', headerRight: () => <Button title="Save" small onPress={save} /> }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input label="Name" value={e.name} onChangeText={(name) => setE({ ...e, name })} placeholder="e.g. Belt Squat (Machine)" />

        <H2>Tracks</H2>
        <ChipRow>
          {ALL_FIELDS.map((f) => (
            <Chip key={f} label={FIELD_LABELS[f]} selected={e.fields.includes(f)} onPress={() => toggleField(f)} />
          ))}
        </ChipRow>
        <T faint size={12} style={{ marginTop: -space.sm, marginBottom: space.md }}>
          Any combination works, e.g. Weight + Time for weighted planks or Weight + Distance for carries.
        </T>

        <H2>Body part</H2>
        <ChipRow>
          {BODY_PARTS.map((b) => <Chip key={b} label={b} selected={e.bodyPart === b} onPress={() => setE({ ...e, bodyPart: b })} />)}
        </ChipRow>
        <H2>Movement pattern</H2>
        <ChipRow>
          {PATTERNS.map((p) => <Chip key={p} label={p} selected={e.pattern === p} onPress={() => setE({ ...e, pattern: p })} />)}
        </ChipRow>
        <H2>Equipment</H2>
        <ChipRow>
          {EQUIPMENT.map((q) => <Chip key={q} label={q} selected={e.equipment === q} onPress={() => setE({ ...e, equipment: q })} />)}
        </ChipRow>
        <H2>Rest timer</H2>
        <ChipRow>
          {REST_OPTIONS.map((r) => (
            <Chip
              key={String(r)}
              label={r == null ? 'Default' : r === 0 ? 'Off' : fmtDuration(r)}
              selected={e.restSeconds === r}
              onPress={() => setE({ ...e, restSeconds: r })}
            />
          ))}
        </ChipRow>
        <Input
          label="Notes (shown during workouts — seat height, grip, cues…)"
          value={e.notes}
          onChangeText={(notes) => setE({ ...e, notes })}
          multiline
        />

        {existing && (
          <View style={{ gap: space.sm, marginTop: space.lg }}>
            <Button
              title={e.hidden ? 'Unhide exercise' : 'Hide exercise'}
              variant="secondary"
              onPress={() => {
                saveExercise({ ...e, hidden: !e.hidden });
                setE({ ...e, hidden: !e.hidden });
              }}
            />
            <Button title="Merge into another exercise…" variant="secondary" onPress={() => setMerging(true)} />
            <Button
              title="Swap recorded reps ↔ time values"
              variant="secondary"
              onPress={() =>
                Alert.alert(
                  'Swap reps and time?',
                  'For every logged set of this exercise, the reps value moves to time (seconds) and vice versa. Use this after changing what the exercise tracks.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Swap', onPress: () => swapRepsAndDuration(e.id) },
                  ],
                )
              }
            />
            <Button title="Delete exercise" variant="danger" onPress={tryDelete} />
          </View>
        )}
      </ScrollView>
      <ExercisePicker visible={merging} multi={false} title="Merge into…" excludeIds={[e.id]} onClose={() => setMerging(false)} onPick={onMerge} />
    </View>
  );
}
