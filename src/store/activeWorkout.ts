import { create } from 'zustand';
import { kvGet, kvSet } from '@/db';
import { cancelNotification, scheduleRestDone } from '@/lib/notifications';
import { getSettings } from '@/store/settings';
import type { ActiveWorkout, DraftExercise, WorkoutDraft } from '@/types';

const KEY = 'activeWorkout';

function load(): ActiveWorkout | null {
  const raw = kvGet(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveWorkout;
  } catch {
    return null;
  }
}

interface State {
  active: ActiveWorkout | null;
}

export const useActiveWorkout = create<State>(() => ({ active: load() }));

// Persist on every change so an app crash or kill never loses an in-progress workout.
useActiveWorkout.subscribe((s) => {
  kvSet(KEY, s.active ? JSON.stringify(s.active) : null);
});

const get = () => useActiveWorkout.getState().active;
const set = (active: ActiveWorkout | null) => useActiveWorkout.setState({ active });

export interface StartOptions {
  name?: string;
  notes?: string;
  exercises?: DraftExercise[];
  templateId?: string | null;
  workoutId?: string | null;
  startedAt?: number;
  /** Seconds already elapsed (when reopening a finished workout). */
  elapsedSec?: number;
}

export function startWorkout(opts: StartOptions = {}) {
  const now = Date.now();
  const startedAt = opts.startedAt ?? now;
  const pausedTotalMs = opts.elapsedSec != null ? Math.max(0, now - startedAt - opts.elapsedSec * 1000) : 0;
  set({
    name: opts.name ?? defaultWorkoutName(now),
    notes: opts.notes ?? '',
    exercises: opts.exercises ?? [],
    workoutId: opts.workoutId ?? null,
    templateId: opts.templateId ?? null,
    startedAt,
    pausedAt: null,
    pausedTotalMs,
    restEndsAt: null,
    restTotal: 0,
    restNotificationId: null,
  });
}

export function defaultWorkoutName(ts: number): string {
  const h = new Date(ts).getHours();
  if (h < 5) return 'Night Workout';
  if (h < 12) return 'Morning Workout';
  if (h < 17) return 'Afternoon Workout';
  if (h < 21) return 'Evening Workout';
  return 'Night Workout';
}

/** Only copies the editable fields, so a stale draft can't clobber timer state. */
export function updateDraft(draft: WorkoutDraft) {
  const a = get();
  if (a) set({ ...a, name: draft.name, notes: draft.notes, exercises: draft.exercises });
}

export function elapsedMs(a: ActiveWorkout, now = Date.now()): number {
  return (a.pausedAt ?? now) - a.startedAt - a.pausedTotalMs;
}

export function togglePause() {
  const a = get();
  if (!a) return;
  if (a.pausedAt) set({ ...a, pausedTotalMs: a.pausedTotalMs + (Date.now() - a.pausedAt), pausedAt: null });
  else set({ ...a, pausedAt: Date.now() });
}

export function startRest(seconds: number) {
  const a = get();
  if (!a || seconds <= 0) return;
  void cancelNotification(a.restNotificationId);
  const restEndsAt = Date.now() + seconds * 1000;
  set({ ...a, restEndsAt, restTotal: seconds, restNotificationId: null });
  scheduleIfEnabled(restEndsAt);
}

function scheduleIfEnabled(restEndsAt: number) {
  if (!getSettings().restTimerNotification) return;
  void scheduleRestDone((restEndsAt - Date.now()) / 1000).then((id) => {
    const cur = get();
    if (cur && cur.restEndsAt === restEndsAt) set({ ...cur, restNotificationId: id });
    else void cancelNotification(id);
  });
}

export function adjustRest(deltaSec: number) {
  const a = get();
  if (!a || !a.restEndsAt) return;
  void cancelNotification(a.restNotificationId);
  const restEndsAt = a.restEndsAt + deltaSec * 1000;
  if (restEndsAt <= Date.now()) {
    set({ ...a, restEndsAt: null, restNotificationId: null });
    return;
  }
  set({ ...a, restEndsAt, restTotal: Math.max(1, a.restTotal + deltaSec), restNotificationId: null });
  scheduleIfEnabled(restEndsAt);
}

export function skipRest() {
  const a = get();
  if (!a) return;
  void cancelNotification(a.restNotificationId);
  set({ ...a, restEndsAt: null, restNotificationId: null });
}

export function clearWorkout() {
  const a = get();
  if (a) void cancelNotification(a.restNotificationId);
  set(null);
}
