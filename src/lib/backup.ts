import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { db, kvGet, kvSet, placeholders } from '@/db';
import { createExercise, findExerciseByName, getExercise, refreshExercises } from '@/repo/exercises';
import { getWorkout, saveWorkout } from '@/repo/workouts';
import { useSettings, type Settings } from '@/store/settings';
import { uid } from '@/lib/id';
import { distanceUnit, fmtNum, fromDisplayDistance, fromDisplayWeight, toDisplayDistance, toDisplayWeight } from '@/lib/units';
import type { DraftExercise, DraftSet, Field, SetType, Unit } from '@/types';

// Parent tables first: INSERT OR REPLACE on a parent cascades deletes to its children.
const TABLES = ['exercises', 'workouts', 'workout_exercises', 'sets', 'templates', 'measurements'] as const;

const stamp = () => new Date().toISOString().slice(0, 10);

async function shareText(name: string, text: string, mimeType: string) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
}

async function pickText(types: string[]): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return null;
  return new File(res.assets[0].uri).text();
}

export async function exportBackup() {
  const data: Record<string, unknown[]> = {};
  for (const t of TABLES) data[t] = db.getAllSync(`SELECT * FROM ${t}`);
  const json = JSON.stringify({ app: 'liftlog', version: 1, exportedAt: Date.now(), settings: kvGet('settings'), data });
  await shareText(`liftlog-backup-${stamp()}.json`, json, 'application/json');
}

export async function importBackup(): Promise<number | null> {
  const text = await pickText(['application/json', 'text/plain', '*/*']);
  if (text == null) return null;
  const parsed = JSON.parse(text) as { app?: string; settings?: string | null; data?: Record<string, Record<string, unknown>[]> };
  if (parsed.app !== 'liftlog' || !parsed.data) throw new Error('This is not a LiftLog backup file.');
  let count = 0;
  db.withTransactionSync(() => {
    for (const t of TABLES) {
      for (const row of parsed.data![t] ?? []) {
        const cols = Object.keys(row).filter((c) => /^[a-z_]+$/.test(c));
        if (!cols.length) continue;
        db.runSync(
          `INSERT OR REPLACE INTO ${t} (${cols.join(',')}) VALUES (${placeholders(cols.length)})`,
          cols.map((c) => row[c] as string | number | null),
        );
        if (t === 'workouts') count++;
      }
    }
  });
  if (parsed.settings) {
    kvSet('settings', parsed.settings);
    try {
      useSettings.setState(JSON.parse(parsed.settings) as Partial<Settings>);
    } catch {
      // keep current settings
    }
  }
  refreshExercises();
  return count;
}

// ---- CSV (Strong-compatible) ----

const CSV_HEADER = ['Date', 'Workout Name', 'Duration', 'Exercise Name', 'Set Order', 'Weight', 'Reps', 'Distance', 'Seconds', 'Notes', 'Workout Notes', 'RPE'];

function csvCell(v: string | number | null | undefined): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function localStamp(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function durationText(sec: number): string {
  const m = Math.round(sec / 60);
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}

export async function exportCSV() {
  const unit = useSettings.getState().unit;
  const ids = db
    .getAllSync<{ id: string }>('SELECT id FROM workouts WHERE deleted_at IS NULL ORDER BY started_at')
    .map((r) => r.id);
  const lines = [CSV_HEADER.join(',')];
  for (const id of ids) {
    const w = getWorkout(id);
    if (!w) continue;
    for (const e of w.exercises) {
      const name = getExercise(e.exerciseId)?.name ?? 'Unknown';
      let n = 0;
      for (const s of e.sets) {
        const order = s.type === 'warmup' ? 'W' : s.type === 'drop' ? 'D' : s.type === 'failure' ? 'F' : String(++n);
        lines.push(
          [
            localStamp(w.startedAt),
            w.name,
            durationText(w.durationSec),
            name,
            order,
            s.weight != null ? fmtNum(toDisplayWeight(s.weight, unit)) : '',
            s.reps ?? '',
            s.distance != null ? fmtNum(toDisplayDistance(s.distance, unit)) : '',
            s.duration ?? '',
            e.notes,
            w.notes,
            s.rpe ?? '',
          ]
            .map(csvCell)
            .join(','),
        );
      }
    }
  }
  await shareText(`liftlog-export-${stamp()}-${unit}-${distanceUnit(unit)}.csv`, lines.join('\n'), 'text/csv');
}

export function parseCSV(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function parseStrongDuration(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const h = /(\d+)\s*h/.exec(t);
  const m = /(\d+)\s*m(?!s)/.exec(t);
  const sec = /(\d+)\s*s/.exec(t);
  return (h ? Number(h[1]) * 3600 : 0) + (m ? Number(m[1]) * 60 : 0) + (sec ? Number(sec[1]) : 0);
}

function parseStrongDate(s: string): number {
  const t = s.trim().replace(' ', 'T');
  const ts = new Date(t).getTime();
  return Number.isNaN(ts) ? Date.now() : ts;
}

const num = (s: string | undefined): number | null => {
  if (s == null) return null;
  const n = Number(s.trim().replace(',', '.'));
  return s.trim() && Number.isFinite(n) ? n : null;
};

export interface StrongImportResult {
  workouts: number;
  skipped: number;
  newExercises: number;
}

/** Imports a CSV exported from Strong (Settings → Export data). Weights are read in `unit`. */
export async function importStrongCSV(unit: Unit): Promise<StrongImportResult | null> {
  const text = await pickText(['text/csv', 'text/comma-separated-values', 'text/plain', '*/*']);
  if (text == null) return null;
  const firstLine = text.slice(0, text.indexOf('\n'));
  const delim = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
  const rows = parseCSV(text.replace(/^\uFEFF/, ''), delim);
  const header = rows.shift()?.map((h) => h.trim().toLowerCase()) ?? [];
  const col = (name: string) => header.indexOf(name);
  const iDate = col('date');
  const iName = col('workout name');
  const iEx = col('exercise name');
  if (iDate < 0 || iEx < 0) throw new Error('This does not look like a Strong CSV export (missing Date / Exercise Name columns).');
  const iDur = col('duration');
  const iOrder = col('set order');
  const iW = col('weight');
  const iR = col('reps');
  const iD = col('distance');
  const iS = col('seconds');
  const iN = col('notes');
  const iWN = col('workout notes');
  const iRPE = col('rpe');
  const iWU = col('weight unit');
  const iDU = col('distance unit');

  const groups = new Map<string, string[][]>();
  for (const r of rows) {
    const key = `${r[iDate]}|${iName >= 0 ? r[iName] : ''}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  let workouts = 0;
  let skipped = 0;
  let newExercises = 0;

  for (const rs of groups.values()) {
    const first = rs[0];
    const startedAt = parseStrongDate(first[iDate]);
    const name = (iName >= 0 ? first[iName] : '') || 'Workout';
    const dup = db.getFirstSync<{ id: string }>('SELECT id FROM workouts WHERE started_at = ? AND name = ? AND deleted_at IS NULL', [startedAt, name]);
    if (dup) {
      skipped++;
      continue;
    }
    const durationSec = iDur >= 0 ? parseStrongDuration(first[iDur]) : 0;
    const exercises: DraftExercise[] = [];
    let current: DraftExercise | null = null;
    let currentName = '';
    for (const r of rs) {
      const order = (iOrder >= 0 ? r[iOrder] : '').trim();
      if (/rest|note/i.test(order)) continue;
      const exName = r[iEx]?.trim();
      if (!exName) continue;
      const rowUnit: Unit = iWU >= 0 && /kg/i.test(r[iWU] ?? '') ? 'kg' : iWU >= 0 && /lb/i.test(r[iWU] ?? '') ? 'lb' : unit;
      const w = num(r[iW]);
      const reps = num(r[iR]);
      const dist = num(r[iD]);
      const secs = num(r[iS]);
      const distUnit: Unit = iDU >= 0 ? (/km/i.test(r[iDU] ?? '') ? 'kg' : /mi/i.test(r[iDU] ?? '') ? 'lb' : rowUnit) : rowUnit;
      const type: SetType = /^w/i.test(order) ? 'warmup' : /^d/i.test(order) ? 'drop' : /^f/i.test(order) ? 'failure' : 'normal';
      const set: DraftSet = {
        id: uid(),
        type,
        weight: w ? fromDisplayWeight(w, rowUnit) : null,
        reps: reps ? Math.round(reps) : null,
        duration: secs ? Math.round(secs) : null,
        distance: dist ? fromDisplayDistance(dist, distUnit) : null,
        rpe: num(iRPE >= 0 ? r[iRPE] : undefined),
        completed: true,
      };
      if (!current || exName !== currentName) {
        let ex = findExerciseByName(exName);
        if (!ex) {
          const fields: Field[] = [];
          const sample = rs.filter((x) => x[iEx]?.trim() === exName);
          if (sample.some((x) => num(x[iW]))) fields.push('weight');
          if (sample.some((x) => num(x[iR]))) fields.push('reps');
          if (sample.some((x) => num(x[iS]))) fields.push('duration');
          if (sample.some((x) => num(x[iD]))) fields.push('distance');
          ex = createExercise({ name: exName, fields: fields.length ? fields : ['weight', 'reps'] });
          newExercises++;
        }
        current = { id: uid(), exerciseId: ex.id, notes: (iN >= 0 ? r[iN] : '') ?? '', supersetId: null, restSeconds: null, sets: [] };
        currentName = exName;
        exercises.push(current);
      }
      current.sets.push(set);
    }
    if (!exercises.length) continue;
    saveWorkout({
      name,
      notes: (iWN >= 0 ? first[iWN] : '') ?? '',
      startedAt,
      endedAt: startedAt + durationSec * 1000,
      durationSec,
      templateId: null,
      exercises,
    });
    workouts++;
  }
  return { workouts, skipped, newExercises };
}
