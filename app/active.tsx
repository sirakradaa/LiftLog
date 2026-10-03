import React from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import { RestTimerBar } from '@/components/RestTimerBar';
import { WorkoutEditor } from '@/components/WorkoutEditor';
import { Button, IconButton, T, styles } from '@/components/ui';
import { useNow } from '@/lib/hooks';
import { fmtDuration } from '@/lib/units';
import { getExercise } from '@/repo/exercises';
import { getTemplate, saveTemplate } from '@/repo/templates';
import { copyExercises, saveWorkout } from '@/repo/workouts';
import { clearWorkout, elapsedMs, startRest, togglePause, updateDraft, useActiveWorkout } from '@/store/activeWorkout';
import { getSettings, useSettings } from '@/store/settings';
import { colors, space } from '@/theme';
import type { DraftExercise } from '@/types';

function KeepAwake() {
  useKeepAwake();
  return null;
}

export default function ActiveWorkoutScreen() {
  const active = useActiveWorkout((s) => s.active);
  const keepAwake = useSettings((s) => s.keepScreenAwake);
  const now = useNow(1000, !!active && !active.pausedAt);

  if (!active) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <Stack.Screen options={{ title: 'Workout' }} />
        <T dim>No workout in progress.</T>
      </View>
    );
  }

  const onSetCompleted = (ex: DraftExercise, index: number) => {
    if (ex.supersetId) {
      const next = active.exercises[index + 1];
      if (next && next.supersetId === ex.supersetId) return;
    }
    const rest = ex.restSeconds ?? getExercise(ex.exerciseId)?.restSeconds ?? getSettings().defaultRestSeconds;
    if (rest > 0) startRest(rest);
  };

  const doFinish = (markAll: boolean) => {
    const a = useActiveWorkout.getState().active;
    if (!a) return;
    const exercises = a.exercises
      .map((e) => ({ ...e, sets: markAll ? e.sets.map((s) => ({ ...s, completed: true })) : e.sets.filter((s) => s.completed) }))
      .filter((e) => e.sets.length > 0);
    const id = saveWorkout({
      id: a.workoutId,
      name: a.name,
      notes: a.notes,
      startedAt: a.startedAt,
      endedAt: Date.now(),
      durationSec: elapsedMs(a) / 1000,
      templateId: a.templateId,
      exercises,
    });
    const template = a.templateId && !a.workoutId ? getTemplate(a.templateId) : null;
    clearWorkout();
    router.replace(`/workout/${id}?summary=1`);
    if (template) {
      Alert.alert('Update template?', `Save this workout's exercises and values into "${template.name}"?`, [
        { text: 'Keep original', style: 'cancel' },
        { text: 'Update', onPress: () => saveTemplate({ ...template, exercises: copyExercises(exercises) }) },
      ]);
    }
  };

  const finish = () => {
    const all = active.exercises.flatMap((e) => e.sets);
    const incomplete = all.filter((s) => !s.completed).length;
    if (all.length - incomplete === 0 && incomplete === 0) {
      Alert.alert('Nothing to save', 'Add and complete at least one set, or cancel the workout.');
      return;
    }
    if (incomplete > 0) {
      Alert.alert('Unfinished sets', `${incomplete} set${incomplete > 1 ? 's are' : ' is'} not checked off.`, [
        { text: 'Back', style: 'cancel' },
        { text: 'Discard them', onPress: () => doFinish(false) },
        { text: 'Complete all', onPress: () => doFinish(true) },
      ]);
      return;
    }
    Alert.alert('Finish workout?', undefined, [
      { text: 'Back', style: 'cancel' },
      { text: 'Finish', onPress: () => doFinish(false) },
    ]);
  };

  const cancel = () => {
    Alert.alert(
      active.workoutId ? 'Stop editing?' : 'Cancel workout?',
      active.workoutId ? 'Changes since you reopened this workout will be lost.' : 'All progress in this workout will be lost.',
      [
        { text: 'Back', style: 'cancel' },
        {
          text: active.workoutId ? 'Discard changes' : 'Cancel workout',
          style: 'destructive',
          onPress: () => {
            clearWorkout();
            router.back();
          },
        },
      ],
    );
  };

  const elapsed = elapsedMs(active, now) / 1000;

  return (
    <View style={styles.screen}>
      {keepAwake && <KeepAwake />}
      <Stack.Screen
        options={{
          title: fmtDuration(elapsed),
          headerLeft: () => <IconButton name="chevron-down" onPress={() => router.back()} />,
          headerRight: () => <Button title="Finish" variant="success" small onPress={finish} />,
        }}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 200 }]} keyboardShouldPersistTaps="handled">
        <TextInput
          value={active.name}
          onChangeText={(name) => updateDraft({ ...active, name })}
          style={{ color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: space.xs }}
        />
        <Pressable onPress={togglePause} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.md }}>
          <Ionicons name={active.pausedAt ? 'play' : 'pause'} size={16} color={active.pausedAt ? colors.warning : colors.textDim} />
          <T dim size={13} style={{ marginLeft: 6, color: active.pausedAt ? colors.warning : colors.textDim }}>
            {active.pausedAt ? `Paused at ${fmtDuration(elapsed)} — tap to resume` : 'Pause workout timer'}
          </T>
        </Pressable>
        <TextInput
          value={active.notes}
          onChangeText={(notes) => updateDraft({ ...active, notes })}
          placeholder="Workout notes"
          placeholderTextColor={colors.textFaint}
          multiline
          style={{ color: colors.text, marginBottom: space.md, fontSize: 14 }}
        />
        <WorkoutEditor
          draft={active}
          onChange={(d) => updateDraft(d)}
          mode="active"
          excludeWorkoutId={active.workoutId}
          onSetCompleted={onSetCompleted}
        />
        <Button title={active.workoutId ? 'Discard changes' : 'Cancel workout'} variant="danger" onPress={cancel} style={{ marginTop: space.xl }} />
      </ScrollView>
      <RestTimerBar />
    </View>
  );
}
