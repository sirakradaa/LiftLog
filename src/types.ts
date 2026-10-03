export type Field = 'weight' | 'reps' | 'duration' | 'distance';
export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';
export type Unit = 'kg' | 'lb';

export interface Exercise {
  id: string;
  name: string;
  bodyPart: string;
  pattern: string;
  equipment: string;
  fields: Field[];
  isCustom: boolean;
  hidden: boolean;
  notes: string;
  restSeconds: number | null;
}

/** All numeric values are stored in base units: kg, seconds, meters. */
export interface DraftSet {
  id: string;
  type: SetType;
  weight: number | null;
  reps: number | null;
  duration: number | null;
  distance: number | null;
  rpe: number | null;
  completed: boolean;
}

export interface DraftExercise {
  id: string;
  exerciseId: string;
  notes: string;
  supersetId: string | null;
  restSeconds: number | null;
  sets: DraftSet[];
}

export interface WorkoutDraft {
  name: string;
  notes: string;
  exercises: DraftExercise[];
}

export interface ActiveWorkout extends WorkoutDraft {
  /** Set when a saved workout was reopened; finishing overwrites it. */
  workoutId: string | null;
  templateId: string | null;
  startedAt: number;
  pausedAt: number | null;
  pausedTotalMs: number;
  restEndsAt: number | null;
  restTotal: number;
  restNotificationId: string | null;
}

export interface WorkoutRecord extends WorkoutDraft {
  id: string;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  templateId: string | null;
}

export interface WorkoutSummary {
  id: string;
  name: string;
  startedAt: number;
  durationSec: number;
  volume: number;
  setCount: number;
  exercises: { exerciseId: string; sets: number }[];
}

export interface Template {
  id: string;
  name: string;
  folder: string;
  notes: string;
  exercises: DraftExercise[];
  lastUsedAt: number | null;
}

export interface Measurement {
  id: string;
  kind: string;
  value: number;
  measuredAt: number;
}
