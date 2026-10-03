import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ActionMenu, type MenuSpec } from '@/components/ActionMenu';
import { ExercisePicker } from '@/components/ExercisePicker';
import { NumberInput } from '@/components/NumberInput';
import { Button, T } from '@/components/ui';
import { FIELD_LABELS } from '@/data/exercises';
import { uid } from '@/lib/id';
import {
  distanceUnit,
  fmtDuration,
  fmtNum,
  fromDisplayDistance,
  fromDisplayWeight,
  parseDuration,
  parseNumber,
  toDisplayDistance,
  toDisplayWeight,
} from '@/lib/units';
import { previousSets, useExercises } from '@/repo/exercises';
import { useSettings } from '@/store/settings';
import { colors, radius, space, supersetColors } from '@/theme';
import type { DraftExercise, DraftSet, Exercise, Field, SetType, Unit, WorkoutDraft } from '@/types';

export type EditorMode = 'active' | 'edit' | 'template';

export function newSet(from?: DraftSet): DraftSet {
  return {
    id: uid(),
    type: from?.type === 'warmup' ? 'warmup' : 'normal',
    weight: from?.weight ?? null,
    reps: from?.reps ?? null,
    duration: from?.duration ?? null,
    distance: from?.distance ?? null,
    rpe: null,
    completed: false,
  };
}

export function newExercise(exerciseId: string, prev: DraftSet[] = []): DraftExercise {
  const sets = prev.length ? prev.map((s) => ({ ...newSet(), type: s.type })) : [newSet()];
  return { id: uid(), exerciseId, notes: '', supersetId: null, restSeconds: null, sets };
}

function fieldIO(field: Field, unit: Unit) {
  switch (field) {
    case 'weight':
      return {
        parse: (t: string) => {
          const n = parseNumber(t);
          return n == null ? null : fromDisplayWeight(n, unit);
        },
        format: (v: number) => fmtNum(toDisplayWeight(v, unit)),
        label: unit,
      };
    case 'reps':
      return {
        parse: (t: string) => {
          const n = parseNumber(t);
          return n == null ? null : Math.round(n);
        },
        format: (v: number) => String(v),
        label: 'reps',
      };
    case 'duration':
      return { parse: parseDuration, format: fmtDuration, label: 'time' };
    case 'distance':
      return {
        parse: (t: string) => {
          const n = parseNumber(t);
          return n == null ? null : fromDisplayDistance(n, unit);
        },
        format: (v: number) => fmtNum(toDisplayDistance(v, unit)),
        label: distanceUnit(unit),
      };
  }
}

export function formatSet(s: DraftSet, fields: Field[], unit: Unit): string {
  const parts: string[] = [];
  for (const f of fields) {
    const v = s[f];
    if (v == null) continue;
    if (f === 'weight') parts.push(`${fmtNum(toDisplayWeight(v, unit))} ${unit}`);
    else if (f === 'reps') parts.push(`${v}`);
    else if (f === 'duration') parts.push(fmtDuration(v));
    else parts.push(`${fmtNum(toDisplayDistance(v, unit))} ${distanceUnit(unit)}`);
  }
  let text = parts.join(fields[0] === 'weight' && fields[1] === 'reps' ? ' × ' : ' · ');
  if (s.rpe != null) text += ` @${s.rpe}`;
  return text || '—';
}

const SET_TYPE_LABEL: Record<SetType, string> = { normal: 'Normal', warmup: 'Warm-up', drop: 'Drop set', failure: 'Failure' };
const SET_TYPE_COLOR: Record<SetType, string> = {
  normal: colors.text,
  warmup: colors.warmup,
  drop: colors.drop,
  failure: colors.failure,
};
const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];
const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

function setLabels(sets: DraftSet[]): string[] {
  let n = 0;
  return sets.map((s) => {
    if (s.type === 'warmup') return 'W';
    n++;
    if (s.type === 'drop') return 'D';
    if (s.type === 'failure') return 'F';
    return String(n);
  });
}

export function WorkoutEditor({
  draft,
  onChange,
  mode,
  excludeWorkoutId = null,
  onSetCompleted,
}: {
  draft: WorkoutDraft;
  onChange: (d: WorkoutDraft) => void;
  mode: EditorMode;
  excludeWorkoutId?: string | null;
  onSetCompleted?: (exercise: DraftExercise, exerciseIndex: number) => void;
}) {
  const byId = useExercises((s) => s.byId);
  const unit = useSettings((s) => s.unit);
  const [menu, setMenu] = useState<MenuSpec | null>(null);
  const [picker, setPicker] = useState<{ purpose: 'add' } | { purpose: 'replace'; index: number } | null>(null);
  const [notesOpen, setNotesOpen] = useState<Record<string, boolean>>({});

  const exerciseIdsKey = draft.exercises.map((e) => e.exerciseId).join('|');
  const previous = useMemo(() => {
    const map: Record<string, DraftSet[]> = {};
    for (const e of draft.exercises) {
      if (!map[e.exerciseId]) map[e.exerciseId] = previousSets(e.exerciseId, excludeWorkoutId);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseIdsKey, excludeWorkoutId]);

  const supersetColor = useMemo(() => {
    const map: Record<string, string> = {};
    let i = 0;
    for (const e of draft.exercises) {
      if (e.supersetId && !map[e.supersetId]) map[e.supersetId] = supersetColors[i++ % supersetColors.length];
    }
    return map;
  }, [draft.exercises]);

  const setExercises = (exercises: DraftExercise[]) => onChange({ ...draft, exercises });
  const updateExercise = (i: number, fn: (e: DraftExercise) => DraftExercise) =>
    setExercises(draft.exercises.map((e, idx) => (idx === i ? fn(e) : e)));
  const updateSet = (i: number, j: number, fn: (s: DraftSet) => DraftSet) =>
    updateExercise(i, (e) => ({ ...e, sets: e.sets.map((s, k) => (k === j ? fn(s) : s)) }));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.exercises.length) return;
    const arr = [...draft.exercises];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setExercises(arr);
  };

  const supersetWithNext = (i: number) => {
    const a = draft.exercises[i];
    const b = draft.exercises[i + 1];
    if (!b) return;
    const sid = a.supersetId ?? b.supersetId ?? uid();
    setExercises(draft.exercises.map((e, idx) => (idx === i || idx === i + 1 ? { ...e, supersetId: sid } : e)));
  };

  const openExerciseMenu = (i: number) => {
    const ex = draft.exercises[i];
    const name = byId[ex.exerciseId]?.name ?? 'Exercise';
    setMenu({
      title: name,
      items: [
        { label: notesOpen[ex.id] || ex.notes ? 'Hide note' : 'Add note', icon: 'create-outline', onPress: () => setNotesOpen((o) => ({ ...o, [ex.id]: !(o[ex.id] || ex.notes) })) },
        { label: 'Replace exercise (keeps sets & notes)', icon: 'swap-horizontal', onPress: () => setPicker({ purpose: 'replace', index: i }) },
        {
          label: 'Duplicate exercise',
          icon: 'copy-outline',
          onPress: () => {
            const copy: DraftExercise = { ...ex, id: uid(), supersetId: null, sets: ex.sets.map((s) => ({ ...s, id: uid(), completed: false })) };
            const arr = [...draft.exercises];
            arr.splice(i + 1, 0, copy);
            setExercises(arr);
          },
        },
        ...(i > 0 ? [{ label: 'Move up', icon: 'arrow-up' as const, onPress: () => move(i, -1) }] : []),
        ...(i < draft.exercises.length - 1
          ? [
              { label: 'Move down', icon: 'arrow-down' as const, onPress: () => move(i, 1) },
              { label: 'Superset with next exercise', icon: 'link' as const, onPress: () => supersetWithNext(i) },
            ]
          : []),
        ...(ex.supersetId
          ? [{ label: 'Remove from superset', icon: 'unlink' as const, onPress: () => updateExercise(i, (e) => ({ ...e, supersetId: null })) }]
          : []),
        ...(mode !== 'edit'
          ? [
              {
                label: `Rest timer: ${ex.restSeconds == null ? 'default' : ex.restSeconds === 0 ? 'off' : fmtDuration(ex.restSeconds)}`,
                icon: 'timer-outline' as const,
                onPress: () =>
                  setMenu({
                    title: 'Rest timer for this exercise',
                    items: [
                      { label: 'Use default', onPress: () => updateExercise(i, (e) => ({ ...e, restSeconds: null })) },
                      ...REST_OPTIONS.map((sec) => ({
                        label: sec === 0 ? 'Off' : fmtDuration(sec),
                        onPress: () => updateExercise(i, (e) => ({ ...e, restSeconds: sec })),
                      })),
                    ],
                  }),
              },
            ]
          : []),
        { label: 'Exercise history & charts', icon: 'stats-chart', onPress: () => router.push(`/exercise/${ex.exerciseId}`) },
        { label: 'Remove exercise', icon: 'trash-outline', destructive: true, onPress: () => setExercises(draft.exercises.filter((_, idx) => idx !== i)) },
      ],
    });
  };

  const openSetMenu = (i: number, j: number) => {
    const s = draft.exercises[i].sets[j];
    setMenu({
      title: `Set ${j + 1}`,
      items: [
        ...(['normal', 'warmup', 'drop', 'failure'] as SetType[])
          .filter((t) => t !== s.type)
          .map((t) => ({ label: `Mark as ${SET_TYPE_LABEL[t]}`, onPress: () => updateSet(i, j, (x) => ({ ...x, type: t })) })),
        {
          label: s.rpe != null ? `RPE: ${s.rpe}` : 'Add RPE',
          icon: 'speedometer-outline',
          onPress: () =>
            setMenu({
              title: 'Rate of perceived exertion',
              items: [
                { label: 'Clear', onPress: () => updateSet(i, j, (x) => ({ ...x, rpe: null })) },
                ...RPE_OPTIONS.map((r) => ({ label: `RPE ${r}  (${10 - r} in reserve)`, onPress: () => updateSet(i, j, (x) => ({ ...x, rpe: r })) })),
              ],
            }),
        },
        {
          label: 'Duplicate set',
          icon: 'copy-outline',
          onPress: () =>
            updateExercise(i, (e) => {
              const sets = [...e.sets];
              sets.splice(j + 1, 0, { ...s, id: uid(), completed: false });
              return { ...e, sets };
            }),
        },
        { label: 'Delete set', icon: 'trash-outline', destructive: true, onPress: () => updateExercise(i, (e) => ({ ...e, sets: e.sets.filter((_, k) => k !== j) })) },
      ],
    });
  };

  const toggleComplete = (i: number, j: number) => {
    const ex = draft.exercises[i];
    const s = ex.sets[j];
    const exercise = byId[ex.exerciseId];
    let next: DraftSet = { ...s, completed: !s.completed };
    if (next.completed && exercise) {
      const empty = exercise.fields.every((f) => s[f] == null);
      const prev = previous[ex.exerciseId]?.[j];
      if (empty && prev) next = { ...next, weight: prev.weight, reps: prev.reps, duration: prev.duration, distance: prev.distance };
    }
    const nextEx = { ...ex, sets: ex.sets.map((x, k) => (k === j ? next : x)) };
    setExercises(draft.exercises.map((e, idx) => (idx === i ? nextEx : e)));
    if (next.completed) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSetCompleted?.(nextEx, i);
    }
  };

  const onPicked = (ids: string[]) => {
    const p = picker;
    setPicker(null);
    if (!p) return;
    if (p.purpose === 'add') {
      setExercises([...draft.exercises, ...ids.map((id) => newExercise(id, mode === 'edit' ? [] : previous[id] ?? previousSets(id, excludeWorkoutId)))]);
    } else if (ids[0]) {
      updateExercise(p.index, (e) => ({ ...e, exerciseId: ids[0] }));
    }
  };

  return (
    <View>
      {draft.exercises.map((ex, i) => {
        const exercise: Exercise | undefined = byId[ex.exerciseId];
        const fields = exercise?.fields.length ? exercise.fields : (['weight', 'reps'] as Field[]);
        const labels = setLabels(ex.sets);
        const prev = previous[ex.exerciseId] ?? [];
        const showNotes = notesOpen[ex.id] || !!ex.notes;
        const ssColor = ex.supersetId ? supersetColor[ex.supersetId] : null;
        return (
          <View key={ex.id} style={[s.exercise, ssColor ? { borderLeftWidth: 4, borderLeftColor: ssColor } : null]}>
            <View style={s.exerciseHeader}>
              <Pressable style={{ flex: 1 }} onPress={() => router.push(`/exercise/${ex.exerciseId}`)}>
                <T bold size={16} style={{ color: colors.primary }}>{exercise?.name ?? 'Unknown exercise'}</T>
                {ssColor ? <T size={11} style={{ color: ssColor }}>SUPERSET</T> : null}
              </Pressable>
              <Pressable hitSlop={12} onPress={() => openExerciseMenu(i)}>
                <Ionicons name="ellipsis-horizontal" size={22} color={colors.textDim} />
              </Pressable>
            </View>
            {exercise?.notes ? <T faint size={12} style={{ marginBottom: 4 }}>📌 {exercise.notes}</T> : null}
            {showNotes && (
              <TextInput
                value={ex.notes}
                onChangeText={(t) => updateExercise(i, (e) => ({ ...e, notes: t }))}
                placeholder="Notes for this exercise"
                placeholderTextColor={colors.textFaint}
                multiline
                style={s.notes}
              />
            )}
            <View style={s.headRow}>
              <T faint size={11} style={s.colSet}>SET</T>
              <T faint size={11} style={s.colPrev}>PREVIOUS</T>
              {fields.map((f) => (
                <T key={f} faint size={11} style={s.colField}>
                  {fieldIO(f, unit).label.toUpperCase()}
                </T>
              ))}
              {mode !== 'template' && <View style={s.colCheck} />}
            </View>
            {ex.sets.map((set, j) => {
              const p = prev[j];
              const done = set.completed && mode !== 'template';
              return (
                <View key={set.id} style={[s.setRow, done && { backgroundColor: colors.successBg }]}>
                  <Pressable style={s.colSet} onPress={() => openSetMenu(i, j)} hitSlop={6}>
                    <T bold style={{ color: SET_TYPE_COLOR[set.type], textAlign: 'center' }}>{labels[j]}</T>
                    {set.rpe != null && <T size={9} faint style={{ textAlign: 'center' }}>@{set.rpe}</T>}
                  </Pressable>
                  <Pressable
                    style={s.colPrev}
                    onPress={() => p && updateSet(i, j, (x) => ({ ...x, weight: p.weight, reps: p.reps, duration: p.duration, distance: p.distance }))}
                  >
                    <T faint size={12} numberOfLines={1}>{p ? formatSet(p, fields, unit) : '—'}</T>
                  </Pressable>
                  {fields.map((f) => {
                    const io = fieldIO(f, unit);
                    return (
                      <NumberInput
                        key={f}
                        value={set[f]}
                        onChange={(v) => updateSet(i, j, (x) => ({ ...x, [f]: v }))}
                        parse={io.parse}
                        format={io.format}
                        placeholder={p?.[f] != null ? io.format(p[f] as number) : FIELD_LABELS[f].slice(0, 4)}
                        keyboardType={f === 'duration' ? 'numbers-and-punctuation' : f === 'reps' ? 'number-pad' : 'decimal-pad'}
                        style={[s.colField, s.fieldInput, done && { backgroundColor: 'transparent' }]}
                      />
                    );
                  })}
                  {mode !== 'template' && (
                    <Pressable style={s.colCheck} onPress={() => toggleComplete(i, j)} hitSlop={6}>
                      <View style={[s.check, done && { backgroundColor: colors.success }]}>
                        <Ionicons name="checkmark" size={18} color={done ? '#fff' : colors.textFaint} />
                      </View>
                    </Pressable>
                  )}
                </View>
              );
            })}
            <Button
              title="Add set"
              icon="add"
              variant="secondary"
              small
              style={{ marginTop: space.sm }}
              onPress={() => updateExercise(i, (e) => ({ ...e, sets: [...e.sets, newSet(e.sets[e.sets.length - 1])] }))}
            />
          </View>
        );
      })}

      <Button title="Add exercises" icon="add" variant="ghost" onPress={() => setPicker({ purpose: 'add' })} style={{ marginTop: space.sm }} />

      <ExercisePicker
        visible={!!picker}
        multi={picker?.purpose !== 'replace'}
        title={picker?.purpose === 'replace' ? 'Replace exercise' : 'Add exercises'}
        onClose={() => setPicker(null)}
        onPick={onPicked}
      />
      <ActionMenu spec={menu} onClose={() => setMenu(null)} />
    </View>
  );
}

const s = StyleSheet.create({
  exercise: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, marginBottom: space.md },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
  notes: {
    backgroundColor: colors.cardAlt,
    color: colors.text,
    borderRadius: radius.sm,
    padding: space.sm,
    marginBottom: space.sm,
    fontSize: 14,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderRadius: radius.sm },
  colSet: { width: 34, textAlign: 'center' },
  colPrev: { flex: 1, paddingHorizontal: 4 },
  colField: { width: 64, textAlign: 'center', marginHorizontal: 3 },
  colCheck: { width: 40, alignItems: 'center' },
  fieldInput: {
    backgroundColor: colors.cardAlt,
    color: colors.text,
    borderRadius: radius.sm,
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: '600',
  },
  check: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
