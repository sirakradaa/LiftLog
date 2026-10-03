import { db, placeholders } from '@/db';
import { uid } from '@/lib/id';
import { bestsOf, emptyBests, setVolume, type Bests } from '@/lib/calc';
import { toDraftSet } from '@/repo/exercises';
import type { DraftExercise, DraftSet, WorkoutRecord, WorkoutSummary } from '@/types';

export interface SaveWorkoutInput {
  id?: string | null;
  name: string;
  notes: string;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  templateId: string | null;
  exercises: DraftExercise[];
}

export function saveWorkout(input: SaveWorkoutInput): string {
  const id = input.id ?? uid();
  const now = Date.now();
  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO workouts (id, name, notes, started_at, ended_at, duration_sec, template_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, notes = excluded.notes, started_at = excluded.started_at,
         ended_at = excluded.ended_at, duration_sec = excluded.duration_sec, template_id = excluded.template_id,
         updated_at = excluded.updated_at, deleted_at = NULL`,
      [id, input.name.trim() || 'Workout', input.notes, input.startedAt, input.endedAt, Math.round(input.durationSec), input.templateId, now],
    );
    db.runSync('DELETE FROM workout_exercises WHERE workout_id = ?', [id]);
    input.exercises.forEach((ex, i) => {
      const weId = uid();
      db.runSync(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, position, notes, superset_id, rest_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [weId, id, ex.exerciseId, i, ex.notes, ex.supersetId, ex.restSeconds],
      );
      ex.sets.forEach((s, j) => {
        db.runSync(
          `INSERT INTO sets (id, workout_exercise_id, position, type, weight, reps, duration, distance, rpe, completed)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uid(), weId, j, s.type, s.weight, s.reps, s.duration, s.distance, s.rpe, s.completed ? 1 : 0],
        );
      });
    });
  });
  return id;
}

interface WorkoutRow {
  id: string;
  name: string;
  notes: string;
  started_at: number;
  ended_at: number;
  duration_sec: number;
  template_id: string | null;
}

export function getWorkout(id: string): WorkoutRecord | null {
  const w = db.getFirstSync<WorkoutRow>('SELECT * FROM workouts WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!w) return null;
  const wes = db.getAllSync<{
    id: string;
    exercise_id: string;
    notes: string;
    superset_id: string | null;
    rest_seconds: number | null;
  }>('SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY position', [id]);
  const sets = wes.length
    ? db.getAllSync<Parameters<typeof toDraftSet>[0] & { workout_exercise_id: string }>(
        `SELECT * FROM sets WHERE workout_exercise_id IN (${placeholders(wes.length)}) ORDER BY position`,
        wes.map((we) => we.id),
      )
    : [];
  return {
    id: w.id,
    name: w.name,
    notes: w.notes,
    startedAt: w.started_at,
    endedAt: w.ended_at,
    durationSec: w.duration_sec,
    templateId: w.template_id,
    exercises: wes.map((we) => ({
      id: we.id,
      exerciseId: we.exercise_id,
      notes: we.notes,
      supersetId: we.superset_id,
      restSeconds: we.rest_seconds,
      sets: sets.filter((s) => s.workout_exercise_id === we.id).map(toDraftSet),
    })),
  };
}

export function listWorkouts(limit = 50, offset = 0): WorkoutSummary[] {
  const rows = db.getAllSync<WorkoutRow>(
    'SELECT * FROM workouts WHERE deleted_at IS NULL ORDER BY started_at DESC LIMIT ? OFFSET ?',
    [limit, offset],
  );
  if (!rows.length) return [];
  const agg = db.getAllSync<{ workout_id: string; exercise_id: string; sets: number; volume: number }>(
    `SELECT we.workout_id, we.exercise_id, COUNT(s.id) AS sets,
       COALESCE(SUM(COALESCE(s.weight, 0) * COALESCE(s.reps, 0)), 0) AS volume
     FROM workout_exercises we LEFT JOIN sets s ON s.workout_exercise_id = we.id AND s.completed = 1
     WHERE we.workout_id IN (${placeholders(rows.length)})
     GROUP BY we.id ORDER BY we.position`,
    rows.map((r) => r.id),
  );
  return rows.map((r) => {
    const mine = agg.filter((a) => a.workout_id === r.id);
    return {
      id: r.id,
      name: r.name,
      startedAt: r.started_at,
      durationSec: r.duration_sec,
      volume: mine.reduce((acc, a) => acc + a.volume, 0),
      setCount: mine.reduce((acc, a) => acc + a.sets, 0),
      exercises: mine.map((a) => ({ exerciseId: a.exercise_id, sets: a.sets })),
    };
  });
}

export function deleteWorkout(id: string) {
  db.runSync('UPDATE workouts SET deleted_at = ?, updated_at = ? WHERE id = ?', [Date.now(), Date.now(), id]);
}

export function totalWorkouts(): number {
  return db.getFirstSync<{ c: number }>('SELECT COUNT(*) AS c FROM workouts WHERE deleted_at IS NULL')?.c ?? 0;
}

export function workoutTimestamps(since: number): number[] {
  return db
    .getAllSync<{ started_at: number }>(
      'SELECT started_at FROM workouts WHERE deleted_at IS NULL AND started_at >= ? ORDER BY started_at',
      [since],
    )
    .map((r) => r.started_at);
}

export function startOfWeek(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d.getTime();
}

export function workoutsPerWeek(weeks: number): { weekStart: number; count: number }[] {
  const thisWeek = startOfWeek(Date.now());
  const starts: number[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisWeek);
    d.setDate(d.getDate() - i * 7);
    starts.push(d.getTime());
  }
  const ts = workoutTimestamps(starts[0]);
  return starts.map((s, i) => {
    const end = starts[i + 1] ?? Infinity;
    return { weekStart: s, count: ts.filter((t) => t >= s && t < end).length };
  });
}

/** Personal bests for an exercise from workouts started before `beforeTs` (excluding one workout). */
export function bestsBefore(exerciseId: string, beforeTs: number, excludeWorkoutId: string): Bests {
  const rows = db.getAllSync<Parameters<typeof toDraftSet>[0]>(
    `SELECT s.* FROM sets s
     JOIN workout_exercises we ON we.id = s.workout_exercise_id
     JOIN workouts w ON w.id = we.workout_id
     WHERE we.exercise_id = ? AND w.deleted_at IS NULL AND w.started_at < ? AND w.id != ? AND s.completed = 1`,
    [exerciseId, beforeTs, excludeWorkoutId],
  );
  return bestsOf(rows.map(toDraftSet), emptyBests());
}

export interface PersonalRecord {
  exerciseId: string;
  kind: keyof Bests;
  value: number;
}

const PR_KINDS: (keyof Bests)[] = ['weight', 'e1rm', 'setVolume', 'duration', 'distance'];

export function workoutPRs(w: WorkoutRecord): PersonalRecord[] {
  const prs: PersonalRecord[] = [];
  const seen = new Set<string>();
  for (const ex of w.exercises) {
    if (seen.has(ex.exerciseId)) continue;
    seen.add(ex.exerciseId);
    const allSets = w.exercises.filter((e) => e.exerciseId === ex.exerciseId).flatMap((e) => e.sets);
    const now = bestsOf(allSets);
    const before = bestsBefore(ex.exerciseId, w.startedAt, w.id);
    for (const k of PR_KINDS) {
      // Only count a PR when there was previous history to beat.
      if (now[k] > 0 && before[k] > 0 && now[k] > before[k] + 1e-9) {
        prs.push({ exerciseId: ex.exerciseId, kind: k, value: now[k] });
      }
    }
  }
  return prs;
}

export function workoutVolume(exercises: DraftExercise[]): number {
  return exercises.reduce((acc, e) => acc + e.sets.reduce((a, s) => a + setVolume(s), 0), 0);
}

export function copySets(sets: DraftSet[], keepCompleted: boolean): DraftSet[] {
  return sets.map((s) => ({ ...s, id: uid(), completed: keepCompleted ? s.completed : false }));
}

export function copyExercises(exercises: DraftExercise[], keepCompleted = false): DraftExercise[] {
  const supersetMap = new Map<string, string>();
  return exercises.map((e) => {
    let supersetId: string | null = null;
    if (e.supersetId) {
      supersetId = supersetMap.get(e.supersetId) ?? uid();
      supersetMap.set(e.supersetId, supersetId);
    }
    return { ...e, id: uid(), supersetId, sets: copySets(e.sets, keepCompleted) };
  });
}
