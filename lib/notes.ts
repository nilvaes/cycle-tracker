import { getDb } from './db';

export type DailyNote = {
  id: number;
  logDate: string;
  text: string;
  createdAt: number;
};

export async function createNote(input: { logDate: string; text: string }) {
  const db = await getDb();
  const createdAt = Date.now();
  await db.runAsync(
    'INSERT INTO daily_notes (log_date, text, created_at) VALUES (?, ?, ?);',
    [input.logDate, input.text, createdAt],
  );
}

export async function listNotes() {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    log_date: string;
    text: string;
    created_at: number;
  }>('SELECT * FROM daily_notes ORDER BY created_at DESC;');

  return rows.map((row) => ({
    id: row.id,
    logDate: row.log_date,
    text: row.text,
    createdAt: row.created_at,
  }));
}

export async function listNotesByDate(dateIso: string) {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    log_date: string;
    text: string;
    created_at: number;
  }>('SELECT * FROM daily_notes WHERE log_date = ? ORDER BY created_at DESC;', [dateIso]);

  return rows.map((row) => ({
    id: row.id,
    logDate: row.log_date,
    text: row.text,
    createdAt: row.created_at,
  }));
}

export async function deleteNote(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM daily_notes WHERE id = ?;', [id]);
}

export async function getNoteById(id: number) {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: number;
    log_date: string;
    text: string;
    created_at: number;
  }>('SELECT * FROM daily_notes WHERE id = ?;', [id]);

  if (!row) return null;
  return {
    id: row.id,
    logDate: row.log_date,
    text: row.text,
    createdAt: row.created_at,
  };
}

export async function updateNote(input: { id: number; logDate: string; text: string }) {
  const db = await getDb();
  await db.runAsync('UPDATE daily_notes SET log_date = ?, text = ? WHERE id = ?;', [
    input.logDate,
    input.text,
    input.id,
  ]);
}
