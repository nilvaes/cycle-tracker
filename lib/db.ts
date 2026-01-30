import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('cycle-tracker.db');
  }
  return dbPromise;
}

export async function initDb() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS periods (
      id INTEGER PRIMARY KEY NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      flow_intensity TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS symptom_logs (
      id INTEGER PRIMARY KEY NOT NULL,
      log_date TEXT NOT NULL,
      symptoms TEXT NOT NULL,
      moods TEXT NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS daily_notes (
      id INTEGER PRIMARY KEY NOT NULL,
      log_date TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
}

export async function deleteAllData() {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM periods;
    DELETE FROM symptom_logs;
    DELETE FROM daily_notes;
  `);
}
