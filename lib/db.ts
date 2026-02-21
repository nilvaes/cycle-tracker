import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const normalize = (value: string) => value.trim().toLowerCase();

const symptomKeyByLabel: Record<string, string> = {
  cramps: 'cramps',
  'krämpfe': 'cramps',
  kramp: 'cramps',
  headache: 'headache',
  kopfschmerzen: 'headache',
  'baş ağrısı': 'headache',
  bloating: 'bloating',
  'blähungen': 'bloating',
  'şişkinlik': 'bloating',
  fatigue: 'fatigue',
  'müdigkeit': 'fatigue',
  yorgunluk: 'fatigue',
  nausea: 'nausea',
  'übelkeit': 'nausea',
  'mide bulantısı': 'nausea',
};

const moodKeyByLabel: Record<string, string> = {
  calm: 'calm',
  ruhig: 'calm',
  sakin: 'calm',
  'low energy': 'lowEnergy',
  'wenig energie': 'lowEnergy',
  'düşük enerji': 'lowEnergy',
  irritable: 'irritable',
  reizbar: 'irritable',
  asabi: 'irritable',
  anxious: 'anxious',
  'ängstlich': 'anxious',
  endişeli: 'anxious',
  happy: 'happy',
  glücklich: 'happy',
  mutlu: 'happy',
};

function normalizeOption(type: 'symptom' | 'mood', value: string) {
  const key = normalize(value);
  return type === 'symptom'
    ? (symptomKeyByLabel[key] ?? value)
    : (moodKeyByLabel[key] ?? value);
}

function parseAndNormalize(raw: string, type: 'symptom' | 'mood') {
  try {
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return raw;
    return JSON.stringify(parsed.map((item) => normalizeOption(type, item)));
  } catch {
    return raw;
  }
}

async function migrateSymptomOptionKeys(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<{
    id: number;
    symptoms: string;
    moods: string;
  }>('SELECT id, symptoms, moods FROM symptom_logs;');

  for (const row of rows) {
    const normalizedSymptoms = parseAndNormalize(row.symptoms, 'symptom');
    const normalizedMoods = parseAndNormalize(row.moods, 'mood');
    if (normalizedSymptoms !== row.symptoms || normalizedMoods !== row.moods) {
      await db.runAsync(
        'UPDATE symptom_logs SET symptoms = ?, moods = ? WHERE id = ?;',
        [normalizedSymptoms, normalizedMoods, row.id],
      );
    }
  }
}

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
  await migrateSymptomOptionKeys(db);
}

export async function deleteAllData() {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM periods;
    DELETE FROM symptom_logs;
    DELETE FROM daily_notes;
  `);
}
