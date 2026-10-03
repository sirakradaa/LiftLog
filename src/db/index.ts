import * as SQLite from 'expo-sqlite';
import { SEED_EXERCISES, builtinId } from '@/data/exercises';

export const db = SQLite.openDatabaseSync('liftlog.db');

// Every row carries updated_at / deleted_at (soft delete) and a UUID id so a
// cloud sync layer can later reconcile changes between devices.
const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  body_part TEXT NOT NULL DEFAULT 'Other',
  pattern TEXT NOT NULL DEFAULT 'Other',
  equipment TEXT NOT NULL DEFAULT 'Other',
  fields TEXT NOT NULL DEFAULT 'weight,reps',
  is_custom INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  rest_seconds INTEGER,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  template_id TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_workouts_started ON workouts(started_at);
CREATE TABLE IF NOT EXISTS workout_exercises (
  id TEXT PRIMARY KEY NOT NULL,
  workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  superset_id TEXT,
  rest_seconds INTEGER
);
CREATE INDEX IF NOT EXISTS idx_we_workout ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_we_exercise ON workout_exercises(exercise_id);
CREATE TABLE IF NOT EXISTS sets (
  id TEXT PRIMARY KEY NOT NULL,
  workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'normal',
  weight REAL,
  reps INTEGER,
  duration INTEGER,
  distance REAL,
  rpe REAL,
  completed INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_sets_we ON sets(workout_exercise_id);
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  folder TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  data TEXT NOT NULL,
  last_used_at INTEGER,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  value REAL NOT NULL,
  measured_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_measurements_kind ON measurements(kind, measured_at);
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

function seedExercises() {
  const now = Date.now();
  for (const [name, bodyPart, pattern, equipment, fields] of SEED_EXERCISES) {
    db.runSync(
      `INSERT OR IGNORE INTO exercises (id, name, body_part, pattern, equipment, fields, is_custom, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [builtinId(name), name, bodyPart, pattern, equipment, (fields ?? ['weight', 'reps']).join(','), now],
    );
  }
}

function migrate() {
  db.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const version = db.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
  if (version < 1) {
    db.withTransactionSync(() => {
      db.execSync(SCHEMA_V1);
      seedExercises();
    });
    db.execSync('PRAGMA user_version = 1');
  }
}

migrate();

export function kvGet(key: string): string | null {
  return db.getFirstSync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key])?.value ?? null;
}

export function kvSet(key: string, value: string | null) {
  if (value === null) db.runSync('DELETE FROM kv WHERE key = ?', [key]);
  else db.runSync('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
}

export function placeholders(n: number): string {
  return new Array(n).fill('?').join(',');
}
