import { Alert } from 'react-native';
import { router } from 'expo-router';
import { clearWorkout, startWorkout, useActiveWorkout, type StartOptions } from '@/store/activeWorkout';

/** Starts a workout, asking first if one is already in progress. */
export function beginWorkout(opts: StartOptions = {}) {
  const go = () => {
    startWorkout(opts);
    router.push('/active');
  };
  if (!useActiveWorkout.getState().active) return go();
  Alert.alert('Workout in progress', 'You already have a workout in progress.', [
    { text: 'Resume it', onPress: () => router.push('/active') },
    {
      text: 'Discard & start new',
      style: 'destructive',
      onPress: () => {
        clearWorkout();
        go();
      },
    },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
