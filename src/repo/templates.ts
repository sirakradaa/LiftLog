import { db } from '@/db';
import { uid } from '@/lib/id';
import type { DraftExercise, Template } from '@/types';

interface TemplateRow {
  id: string;
  name: string;
  folder: string;
  notes: string;
  data: string;
  last_used_at: number | null;
}

const toTemplate = (r: TemplateRow): Template => {
  let exercises: DraftExercise[] = [];
  try {
    exercises = JSON.parse(r.data) as DraftExercise[];
  } catch {
    exercises = [];
  }
  return { id: r.id, name: r.name, folder: r.folder, notes: r.notes, exercises, lastUsedAt: r.last_used_at };
};

export function listTemplates(): Template[] {
  return db
    .getAllSync<TemplateRow>('SELECT * FROM templates WHERE deleted_at IS NULL ORDER BY folder COLLATE NOCASE, name COLLATE NOCASE')
    .map(toTemplate);
}

export function getTemplate(id: string): Template | null {
  const r = db.getFirstSync<TemplateRow>('SELECT * FROM templates WHERE id = ? AND deleted_at IS NULL', [id]);
  return r ? toTemplate(r) : null;
}

export function saveTemplate(t: Omit<Template, 'id' | 'lastUsedAt'> & { id?: string | null; lastUsedAt?: number | null }): string {
  const id = t.id ?? uid();
  const exercises = t.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, completed: false })) }));
  db.runSync(
    `INSERT INTO templates (id, name, folder, notes, data, last_used_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, folder = excluded.folder, notes = excluded.notes,
       data = excluded.data, updated_at = excluded.updated_at, deleted_at = NULL`,
    [id, t.name.trim() || 'Template', t.folder.trim(), t.notes, JSON.stringify(exercises), t.lastUsedAt ?? null, Date.now()],
  );
  return id;
}

export function deleteTemplate(id: string) {
  db.runSync('UPDATE templates SET deleted_at = ?, updated_at = ? WHERE id = ?', [Date.now(), Date.now(), id]);
}

export function markTemplateUsed(id: string) {
  db.runSync('UPDATE templates SET last_used_at = ? WHERE id = ?', [Date.now(), id]);
}

export function listFolders(): string[] {
  return db
    .getAllSync<{ folder: string }>(
      "SELECT DISTINCT folder FROM templates WHERE deleted_at IS NULL AND folder != '' ORDER BY folder COLLATE NOCASE",
    )
    .map((r) => r.folder);
}
