import { getDb } from './db';

export type SymptomLog = {
  id: number;
  logDate: string;
  symptoms: string[];
  moods: string[];
  notes: string | null;
  createdAt: number;
};

export async function createSymptomLog(input: {
  logDate: string;
  symptoms: string[];
  moods: string[];
  notes?: string | null;
}) {
  const db = await getDb();
  const createdAt = Date.now();
  await db.runAsync(
    'INSERT INTO symptom_logs (log_date, symptoms, moods, notes, created_at) VALUES (?, ?, ?, ?, ?);',
    [
      input.logDate,
      JSON.stringify(input.symptoms),
      JSON.stringify(input.moods),
      input.notes ?? null,
      createdAt,
    ],
  );
}

export async function listSymptomLogs() {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    log_date: string;
    symptoms: string;
    moods: string;
    notes: string | null;
    created_at: number;
  }>('SELECT * FROM symptom_logs ORDER BY created_at DESC;');

  return rows.map((row) => ({
    id: row.id,
    logDate: row.log_date,
    symptoms: JSON.parse(row.symptoms) as string[],
    moods: JSON.parse(row.moods) as string[],
    notes: row.notes,
    createdAt: row.created_at,
  }));
}

export async function listSymptomLogsByDate(dateIso: string) {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    log_date: string;
    symptoms: string;
    moods: string;
    notes: string | null;
    created_at: number;
  }>('SELECT * FROM symptom_logs WHERE log_date = ? ORDER BY created_at DESC;', [dateIso]);

  return rows.map((row) => ({
    id: row.id,
    logDate: row.log_date,
    symptoms: JSON.parse(row.symptoms) as string[],
    moods: JSON.parse(row.moods) as string[],
    notes: row.notes,
    createdAt: row.created_at,
  }));
}

export async function deleteSymptomLog(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM symptom_logs WHERE id = ?;', [id]);
}

export async function importSymptomLogs(
  logs: Array<Omit<SymptomLog, 'id'>>,
) {
  const db = await getDb();
  for (const log of logs) {
    await db.runAsync(
      'INSERT INTO symptom_logs (log_date, symptoms, moods, notes, created_at) VALUES (?, ?, ?, ?, ?);',
      [
        log.logDate,
        JSON.stringify(log.symptoms),
        JSON.stringify(log.moods),
        log.notes ?? null,
        log.createdAt,
      ],
    );
  }
}

export async function getSymptomLogById(id: number) {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: number;
    log_date: string;
    symptoms: string;
    moods: string;
    notes: string | null;
    created_at: number;
  }>('SELECT * FROM symptom_logs WHERE id = ?;', [id]);

  if (!row) return null;
  return {
    id: row.id,
    logDate: row.log_date,
    symptoms: JSON.parse(row.symptoms) as string[],
    moods: JSON.parse(row.moods) as string[],
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function updateSymptomLog(input: {
  id: number;
  logDate: string;
  symptoms: string[];
  moods: string[];
  notes?: string | null;
}) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE symptom_logs SET log_date = ?, symptoms = ?, moods = ?, notes = ? WHERE id = ?;',
    [
      input.logDate,
      JSON.stringify(input.symptoms),
      JSON.stringify(input.moods),
      input.notes ?? null,
      input.id,
    ],
  );
}
