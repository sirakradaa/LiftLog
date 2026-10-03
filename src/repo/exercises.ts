import { create } from 'zustand';
import { db } from '@/db';
import { uid } from '@/lib/id';
import type { DraftSet, Exercise, Field, SetType } from '@/types';

interface ExerciseRow {
  id: string;
  name: string;
  body_part: string;
  pattern: string;
  equipment: string;
  fields: string;
  is_custom: number;
  hidden: number;
  notes: string;
  rest_seconds: number | null;
}

const toExercise = (r: ExerciseRow): Exercise => ({
  id: r.id,
  name: r.name,
  bodyPart: r.body_part,
  pattern: r.pattern,
  equipment: r.equipment,
  fields: (r.fields ? r.fields.split(',') : []) as Field[],
  isCustom: !!r.is_custom,
  hidden: !!r.hidden,
  notes: r.notes,
  restSeconds: r.rest_seconds,
});

function loadAll(): Exercise[] {
  return db
    .getAllSync<ExerciseRow>('SELECT * FROM exercises WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE')
    .map(toExercise);
}

interface ExerciseState {
  list: Exercise[];
  byId: Record<string, Exercise>;
}

function buildState(): ExerciseState {
  const list = loadAll();
  return { list, byId: Object.fromEntries(list.map((e) => [e.id, e])) };
}

export const useExercises = create<ExerciseState>(() => buildState());

export function refreshExercises() {
  useExercises.setState(buildState());
}

export function exerciseName(id: string): string {
  return useExercises.getState().byId[id]?.name ?? 'Unknown exercise';
}

export function getExercise(id: string): Exercise | undefined {
  return useExercises.getState().byId[id];
}

export function findExerciseByName(name: string): Exercise | undefined {
  const n = name.trim().toLowerCase();
  return useExercises.getState().list.find((e) => e.name.toLowerCase() === n);
}

export function saveExercise(e: Exercise) {
  db.runSync(
    `INSERT INTO exercises (id, name, body_part, pattern, equipment, fields, is_custom, hidden, notes, rest_seconds, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, body_part = excluded.body_part, pattern = excluded.pattern,
       equipment = excluded.equipment, fields = excluded.fields, hidden = excluded.hidden, notes = excluded.notes,
       rest_seconds = excluded.rest_seconds, updated_at = excluded.updated_at, deleted_at = NULL`,
    [
      e.id,
      e.name.trim(),
      e.bodyPart,
      e.pattern,
      e.equipment,
      e.fields.join(','),
      e.isCustom ? 1 : 0,
      e.hidden ? 1 : 0,
      e.notes,
      e.restSeconds,
      Date.now(),
    ],
  );
  refreshExercises();
}

export function createExercise(partial: Partial<Exercise> & { name: string }): Exercise {
  const e: Exercise = {
    id: uid(),
    bodyPart: 'Other',
    pattern: 'Other',
    equipment: 'Other',
    fields: ['weight', 'reps'],
    isCustom: true,
    hidden: false,
    notes: '',
    restSeconds: null,
    ...partial,
  };
  saveExercise(e);
  return e;
}

export function exerciseUsage(id: string): { workouts: number; templates: number } {
  const workouts =
    db.getFirstSync<{ c: number }>(
      `SELECT COUNT(DISTINCT we.workout_id) AS c FROM workout_exercises we
       JOIN workouts w ON w.id = we.workout_id WHERE we.exercise_id = ? AND w.deleted_at IS NULL`,
      [id],
    )?.c ?? 0;
  const templates =
    db.getFirstSync<{ c: number }>(`SELECT COUNT(*) AS c FROM templates WHERE deleted_at IS NULL AND data LIKE ?`, [
      `%"exerciseId":"${id}"%`,
    ])?.c ?? 0;
  return { workouts, templates };
}

export function deleteExercise(id: string) {
  db.runSync('UPDATE exercises SET deleted_at = ?, updated_at = ? WHERE id = ?', [Date.now(), Date.now(), id]);
  refreshExercises();
}

/** Moves all history and template references from one exercise to another, then deletes the source. */
export function mergeExercise(fromId: string, toId: string) {
  db.withTransactionSync(() => {
    db.runSync('UPDATE workout_exercises SET exercise_id = ? WHERE exercise_id = ?', [toId, fromId]);
    const rows = db.getAllSync<{ id: string; data: string }>('SELECT id, data FROM templates WHERE data LIKE ?', [
      `%"exerciseId":"${fromId}"%`,
    ]);
    for (const r of rows) {
      const data = r.data.split(`"exerciseId":"${fromId}"`).join(`"exerciseId":"${toId}"`);
      db.runSync('UPDATE templates SET data = ?, updated_at = ? WHERE id = ?', [data, Date.now(), r.id]);
    }
    db.runSync('UPDATE exercises SET deleted_at = ?, updated_at = ? WHERE id = ?', [Date.now(), Date.now(), fromId]);
  });
  refreshExercises();
}

/** Re-maps recorded values between the reps and duration columns (e.g. planks logged as "reps"). */
export function swapRepsAndDuration(exerciseId: string) {
  db.runSync(
    `UPDATE sets SET reps = duration, duration = reps
     WHERE workout_exercise_id IN (SELECT id FROM workout_exercises WHERE exercise_id = ?)`,
    [exerciseId],
  );
}

interface SetRow {
  id: string;
  type: string;
  weight: number | null;
  reps: number | null;
  duration: number | null;
  distance: number | null;
  rpe: number | null;
  completed: number;
}

export const toDraftSet = (r: SetRow): DraftSet => ({
  id: r.id,
  type: r.type as SetType,
  weight: r.weight,
  reps: r.reps,
  duration: r.duration,
  distance: r.distance,
  rpe: r.rpe,
  completed: !!r.completed,
});

export interface ExerciseHistoryEntry {
  workoutId: string;
  workoutName: string;
  startedAt: number;
  notes: string;
  sets: DraftSet[];
}

export function exerciseHistory(exerciseId: string): ExerciseHistoryEntry[] {
  const wes = db.getAllSync<{ id: string; workout_id: string; name: string; started_at: number; notes: string }>(
    `SELECT we.id, we.workout_id, w.name, w.started_at, we.notes FROM workout_exercises we
     JOIN workouts w ON w.id = we.workout_id
     WHERE we.exercise_id = ? AND w.deleted_at IS NULL
     ORDER BY w.started_at DESC, we.position`,
    [exerciseId],
  );
  if (!wes.length) return [];
  const sets = db.getAllSync<SetRow & { workout_exercise_id: string }>(
    `SELECT s.* FROM sets s JOIN workout_exercises we ON we.id = s.workout_exercise_id
     WHERE we.exercise_id = ? AND s.completed = 1 ORDER BY s.position`,
    [exerciseId],
  );
  const byWe = new Map<string, DraftSet[]>();
  for (const s of sets) {
    const arr = byWe.get(s.workout_exercise_id) ?? [];
    arr.push(toDraftSet(s));
    byWe.set(s.workout_exercise_id, arr);
  }
  return wes
    .map((we) => ({
      workoutId: we.workout_id,
      workoutName: we.name,
      startedAt: we.started_at,
      notes: we.notes,
      sets: byWe.get(we.id) ?? [],
    }))
    .filter((e) => e.sets.length > 0);
}

/** Completed sets from the most recent workout (other than `excludeWorkoutId`) that included this exercise. */
export function previousSets(exerciseId: string, excludeWorkoutId: string | null): DraftSet[] {
  const we = db.getFirstSync<{ id: string }>(
    `SELECT we.id FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id
     WHERE we.exercise_id = ? AND w.deleted_at IS NULL AND w.id != ?
       AND EXISTS (SELECT 1 FROM sets s WHERE s.workout_exercise_id = we.id AND s.completed = 1)
     ORDER BY w.started_at DESC, we.position LIMIT 1`,
    [exerciseId, excludeWorkoutId ?? ''],
  );
  if (!we) return [];
  return db
    .getAllSync<SetRow>('SELECT * FROM sets WHERE workout_exercise_id = ? AND completed = 1 ORDER BY position', [we.id])
    .map(toDraftSet);
}
