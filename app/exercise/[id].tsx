import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { LineChart } from '@/components/Charts';
import { formatSet } from '@/components/WorkoutEditor';
import { Button, Card, Chip, ChipRow, Empty, H2, Row, T, styles } from '@/components/ui';
import { FIELD_LABELS } from '@/data/exercises';
import { bestsOf, estimate1RM, setVolume } from '@/lib/calc';
import { useFocusData } from '@/lib/hooks';
import { distanceUnit, fmtDate, fmtDuration, fmtNum, fmtWeight, toDisplayDistance, toDisplayWeight } from '@/lib/units';
import { exerciseHistory, useExercises } from '@/repo/exercises';
import { useSettings } from '@/store/settings';
import { colors, space } from '@/theme';

type Tab = 'about' | 'history' | 'charts' | 'records';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = useExercises((s) => s.byId[id]);
  const unit = useSettings((s) => s.unit);
  const [tab, setTab] = useState<Tab>('history');
  const [history] = useFocusData(() => exerciseHistory(id), [id]);

  const charts = useMemo(() => {
    const chrono = [...history].reverse();
    const series = (fn: (sets: (typeof history)[number]['sets']) => number) =>
      chrono.map((h) => ({ x: h.startedAt, y: fn(h.sets) })).filter((p) => p.y > 0);
    return {
      e1rm: series((sets) => toDisplayWeight(bestsOf(sets).e1rm, unit)),
      weight: series((sets) => toDisplayWeight(bestsOf(sets).weight, unit)),
      volume: series((sets) => toDisplayWeight(sets.reduce((a, s) => a + setVolume(s), 0), unit)),
      reps: series((sets) => bestsOf(sets).reps),
      duration: series((sets) => bestsOf(sets).duration),
      distance: series((sets) => toDisplayDistance(bestsOf(sets).distance, unit)),
    };
  }, [history, unit]);

  const records = useMemo(() => {
    const all = history.flatMap((h) => h.sets);
    const bests = bestsOf(all);
    const repMax: Record<number, number> = {};
    for (const s of all) {
      if (s.type === 'warmup' || !s.weight || !s.reps || s.reps > 12) continue;
      repMax[s.reps] = Math.max(repMax[s.reps] ?? 0, s.weight);
    }
    return { bests, repMax, totalSets: all.length, workouts: history.length };
  }, [history]);

  if (!exercise) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <T dim>Exercise not found.</T>
      </View>
    );
  }

  const f = exercise.fields;
  const hasWR = f.includes('weight') && f.includes('reps');

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: exercise.name,
          headerRight: () => <Button title="Edit" small variant="secondary" onPress={() => router.push(`/exercise/edit?id=${exercise.id}`)} />,
        }}
      />
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm }}>
        <ChipRow>
          {(['about', 'history', 'charts', 'records'] as Tab[]).map((t) => (
            <Chip key={t} label={t[0].toUpperCase() + t.slice(1)} selected={tab === t} onPress={() => setTab(t)} />
          ))}
        </ChipRow>
      </View>

      {tab === 'about' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <Info label="Body part" value={exercise.bodyPart} />
            <Info label="Movement pattern" value={exercise.pattern} />
            <Info label="Equipment" value={exercise.equipment} />
            <Info label="Tracks" value={exercise.fields.map((x) => FIELD_LABELS[x]).join(', ')} />
            <Info label="Rest timer" value={exercise.restSeconds == null ? 'Default' : exercise.restSeconds === 0 ? 'Off' : fmtDuration(exercise.restSeconds)} />
            {exercise.hidden && <Info label="Status" value="Hidden" />}
          </Card>
          <Card>
            <H2>Notes</H2>
            <T dim>{exercise.notes || 'No notes. Add machine settings, cues, or form reminders via Edit; they show during workouts.'}</T>
          </Card>
        </ScrollView>
      )}

      {tab === 'history' && (
        <FlatList
          data={history}
          keyExtractor={(h, i) => h.workoutId + i}
          contentContainerStyle={styles.content}
          ListEmptyComponent={<Empty text="No history for this exercise yet." />}
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/workout/${item.workoutId}`)}>
              <T bold>{item.workoutName}</T>
              <T faint size={12} style={{ marginBottom: 4 }}>{fmtDate(item.startedAt)}</T>
              {item.notes ? <T faint size={12} style={{ marginBottom: 4 }}>{item.notes}</T> : null}
              {item.sets.map((s, i) => (
                <Row key={s.id} style={{ justifyContent: 'space-between' }}>
                  <T dim size={14}>{s.type === 'warmup' ? 'W' : i + 1}  {formatSet(s, f, unit)}</T>
                  {s.weight && s.reps ? <T faint size={12}>{fmtWeight(estimate1RM(s.weight, s.reps), unit)}</T> : null}
                </Row>
              ))}
            </Card>
          )}
        />
      )}

      {tab === 'charts' && (
        <ScrollView contentContainerStyle={styles.content}>
          {hasWR && <ChartCard title={`Best set (est. 1RM, ${unit})`} data={charts.e1rm} />}
          {f.includes('weight') && <ChartCard title={`Heaviest weight (${unit})`} data={charts.weight} />}
          {hasWR && <ChartCard title={`Total volume (${unit})`} data={charts.volume} />}
          {f.includes('reps') && !f.includes('weight') && <ChartCard title="Most reps" data={charts.reps} />}
          {f.includes('duration') && <ChartCard title="Longest duration" data={charts.duration} formatY={fmtDuration} />}
          {f.includes('distance') && <ChartCard title={`Longest distance (${distanceUnit(unit)})`} data={charts.distance} formatY={(v) => fmtNum(v, 1)} />}
        </ScrollView>
      )}

      {tab === 'records' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <H2>Personal records</H2>
            {hasWR && <Info label="Estimated 1RM" value={fmtWeight(records.bests.e1rm, unit)} />}
            {f.includes('weight') && <Info label="Heaviest weight" value={fmtWeight(records.bests.weight, unit)} />}
            {hasWR && <Info label="Best set volume" value={fmtWeight(records.bests.setVolume, unit)} />}
            {f.includes('reps') && <Info label="Most reps in a set" value={String(records.bests.reps)} />}
            {f.includes('duration') && <Info label="Longest duration" value={fmtDuration(records.bests.duration)} />}
            {f.includes('distance') && (
              <Info label="Longest distance" value={`${fmtNum(toDisplayDistance(records.bests.distance, unit))} ${distanceUnit(unit)}`} />
            )}
            <Info label="Workouts" value={String(records.workouts)} />
            <Info label="Total sets" value={String(records.totalSets)} />
          </Card>
          {hasWR && Object.keys(records.repMax).length > 0 && (
            <Card>
              <H2>Rep maxes</H2>
              {Object.entries(records.repMax)
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([reps, w]) => (
                  <Info key={reps} label={`${reps} rep${reps === '1' ? '' : 's'}`} value={fmtWeight(w, unit)} />
                ))}
            </Card>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <T dim>{label}</T>
      <T bold>{value}</T>
    </Row>
  );
}

function ChartCard({ title, data, formatY }: { title: string; data: { x: number; y: number }[]; formatY?: (v: number) => string }) {
  return (
    <Card>
      <H2>{title}</H2>
      <LineChart data={data} formatY={formatY ?? ((v) => fmtNum(v, 0))} />
    </Card>
  );
}
