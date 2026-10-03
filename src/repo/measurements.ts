import { db } from '@/db';
import { uid } from '@/lib/id';
import type { Measurement } from '@/types';

export type MeasureType = 'weight' | 'percent' | 'length' | 'kcal';

export interface MeasureKind {
  key: string;
  label: string;
  type: MeasureType;
}

export const MEASURE_KINDS: MeasureKind[] = [
  { key: 'bodyweight', label: 'Weight', type: 'weight' },
  { key: 'bodyfat', label: 'Body fat', type: 'percent' },
  { key: 'calories', label: 'Caloric intake', type: 'kcal' },
  { key: 'neck', label: 'Neck', type: 'length' },
  { key: 'shoulders', label: 'Shoulders', type: 'length' },
  { key: 'chest', label: 'Chest', type: 'length' },
  { key: 'left_bicep', label: 'Left bicep', type: 'length' },
  { key: 'right_bicep', label: 'Right bicep', type: 'length' },
  { key: 'left_forearm', label: 'Left forearm', type: 'length' },
  { key: 'right_forearm', label: 'Right forearm', type: 'length' },
  { key: 'upper_abs', label: 'Upper abs', type: 'length' },
  { key: 'waist', label: 'Waist', type: 'length' },
  { key: 'lower_abs', label: 'Lower abs', type: 'length' },
  { key: 'hips', label: 'Hips', type: 'length' },
  { key: 'left_thigh', label: 'Left thigh', type: 'length' },
  { key: 'right_thigh', label: 'Right thigh', type: 'length' },
  { key: 'left_calf', label: 'Left calf', type: 'length' },
  { key: 'right_calf', label: 'Right calf', type: 'length' },
];

interface Row {
  id: string;
  kind: string;
  value: number;
  measured_at: number;
}

const toM = (r: Row): Measurement => ({ id: r.id, kind: r.kind, value: r.value, measuredAt: r.measured_at });

/** Values are stored as kg, cm, %, or kcal. */
export function listMeasurements(kind: string): Measurement[] {
  return db
    .getAllSync<Row>('SELECT * FROM measurements WHERE kind = ? AND deleted_at IS NULL ORDER BY measured_at DESC', [kind])
    .map(toM);
}

export function latestMeasurement(kind: string): Measurement | null {
  const r = db.getFirstSync<Row>(
    'SELECT * FROM measurements WHERE kind = ? AND deleted_at IS NULL ORDER BY measured_at DESC LIMIT 1',
    [kind],
  );
  return r ? toM(r) : null;
}

export function addMeasurement(kind: string, value: number, measuredAt: number) {
  db.runSync('INSERT INTO measurements (id, kind, value, measured_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
    uid(),
    kind,
    value,
    measuredAt,
    Date.now(),
  ]);
}

export function deleteMeasurement(id: string) {
  db.runSync('UPDATE measurements SET deleted_at = ?, updated_at = ? WHERE id = ?', [Date.now(), Date.now(), id]);
}
