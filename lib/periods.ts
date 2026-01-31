import { getDb } from './db';

export type FlowIntensity = 'light' | 'medium' | 'heavy';

export type PeriodEntry = {
  id: number;
  startDate: string;
  endDate: string | null;
  flowIntensity: FlowIntensity;
  createdAt: number;
};

export async function createPeriod(input: {
  startDate: string;
  endDate?: string | null;
  flowIntensity: FlowIntensity;
}) {
  const db = await getDb();
  const createdAt = Date.now();
  await db.runAsync(
    'INSERT INTO periods (start_date, end_date, flow_intensity, created_at) VALUES (?, ?, ?, ?);',
    [input.startDate, input.endDate ?? null, input.flowIntensity, createdAt],
  );
}

export async function listPeriods() {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    start_date: string;
    end_date: string | null;
    flow_intensity: FlowIntensity;
    created_at: number;
  }>('SELECT * FROM periods ORDER BY created_at DESC;');

  return rows.map((row) => ({
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    flowIntensity: row.flow_intensity,
    createdAt: row.created_at,
  }));
}

export async function getPeriodById(id: number) {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: number;
    start_date: string;
    end_date: string | null;
    flow_intensity: FlowIntensity;
    created_at: number;
  }>('SELECT * FROM periods WHERE id = ?;', [id]);

  if (!row) return null;
  return {
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    flowIntensity: row.flow_intensity,
    createdAt: row.created_at,
  };
}

export async function updatePeriod(input: {
  id: number;
  startDate: string;
  endDate?: string | null;
  flowIntensity: FlowIntensity;
}) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE periods SET start_date = ?, end_date = ?, flow_intensity = ? WHERE id = ?;',
    [input.startDate, input.endDate ?? null, input.flowIntensity, input.id],
  );
}

export async function listPeriodsByDate(dateIso: string) {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    start_date: string;
    end_date: string | null;
    flow_intensity: FlowIntensity;
    created_at: number;
  }>(
    'SELECT * FROM periods WHERE start_date <= ? AND (end_date IS NULL OR end_date >= ?) ORDER BY start_date DESC;',
    [dateIso, dateIso],
  );

  return rows.map((row) => ({
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    flowIntensity: row.flow_intensity,
    createdAt: row.created_at,
  }));
}

export async function deletePeriod(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM periods WHERE id = ?;', [id]);
}

export async function importPeriods(periods: Array<Omit<PeriodEntry, 'id'>>) {
  const db = await getDb();
  for (const period of periods) {
    await db.runAsync(
      'INSERT INTO periods (start_date, end_date, flow_intensity, created_at) VALUES (?, ?, ?, ?);',
      [period.startDate, period.endDate ?? null, period.flowIntensity, period.createdAt],
    );
  }
}
