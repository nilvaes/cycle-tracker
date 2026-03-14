/**
 * Web-only in-memory DB implementation for GitHub Pages / web preview.
 * Uses localStorage for persistence so the app can "show how it looks" with data.
 */

const STORAGE_KEYS = {
  periods: 'cycle-tracker-web-periods',
  symptom_logs: 'cycle-tracker-web-symptom_logs',
  daily_notes: 'cycle-tracker-web-daily_notes',
} as const;

type Row = Record<string, unknown>;

function loadTable(key: keyof typeof STORAGE_KEYS): Row[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS[key]) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as Row[];
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ignore
  }
  return [];
}

function saveTable(key: keyof typeof STORAGE_KEYS, rows: Row[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(rows));
    }
  } catch {
    // ignore
  }
}

function nextId(rows: Row[]): number {
  if (rows.length === 0) return 1;
  const ids = rows.map((r) => (r.id as number) ?? 0);
  return Math.max(...ids, 0) + 1;
}

export interface WebDb {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: (string | number | null)[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T = Row>(sql: string, params?: (string | number | null)[]): Promise<T[]>;
  getFirstAsync<T = Row>(sql: string, params?: (string | number | null)[]): Promise<T | null>;
}

function createWebDb(): WebDb {
  return {
    async execAsync(sql: string) {
      const s = sql.trim();
      if (s.startsWith('CREATE TABLE')) return;
      if (s.startsWith('PRAGMA')) return;
      if (s.includes('DELETE FROM periods')) {
        saveTable('periods', []);
      }
      if (s.includes('DELETE FROM symptom_logs')) {
        saveTable('symptom_logs', []);
      }
      if (s.includes('DELETE FROM daily_notes')) {
        saveTable('daily_notes', []);
      }
    },

    async runAsync(sql: string, params: (string | number | null)[] = []) {
      const s = sql.trim();
      let lastInsertRowId = 0;
      let changes = 0;

      if (s.startsWith('INSERT INTO periods')) {
        const rows = loadTable('periods');
        const id = nextId(rows);
        rows.unshift({
          id,
          start_date: params[0],
          end_date: params[1],
          flow_intensity: params[2],
          created_at: params[3],
        });
        saveTable('periods', rows);
        lastInsertRowId = id;
        changes = 1;
      } else if (s.startsWith('UPDATE periods')) {
        const rows = loadTable('periods');
        const idx = rows.findIndex((r) => r.id === params[3]);
        if (idx >= 0) {
          rows[idx] = {
            ...rows[idx],
            start_date: params[0],
            end_date: params[1],
            flow_intensity: params[2],
          };
          saveTable('periods', rows);
          changes = 1;
        }
      } else if (s.startsWith('DELETE FROM periods')) {
        const rows = loadTable('periods').filter((r) => r.id !== params[0]);
        saveTable('periods', rows);
        changes = 1;
      } else if (s.startsWith('INSERT INTO symptom_logs')) {
        const rows = loadTable('symptom_logs');
        const id = nextId(rows);
        rows.unshift({
          id,
          log_date: params[0],
          symptoms: params[1],
          moods: params[2],
          notes: params[3],
          created_at: params[4],
        });
        saveTable('symptom_logs', rows);
        lastInsertRowId = id;
        changes = 1;
      } else if (s.startsWith('UPDATE symptom_logs')) {
        const rows = loadTable('symptom_logs');
        const idx = rows.findIndex((r) => r.id === params[2]);
        if (idx >= 0) {
          rows[idx] = { ...rows[idx], symptoms: params[0], moods: params[1] };
          saveTable('symptom_logs', rows);
          changes = 1;
        }
      } else if (s.startsWith('DELETE FROM symptom_logs')) {
        const rows = loadTable('symptom_logs').filter((r) => r.id !== params[0]);
        saveTable('symptom_logs', rows);
        changes = 1;
      } else if (s.startsWith('INSERT INTO daily_notes')) {
        const rows = loadTable('daily_notes');
        const id = nextId(rows);
        rows.unshift({
          id,
          log_date: params[0],
          text: params[1],
          created_at: params[2],
        });
        saveTable('daily_notes', rows);
        lastInsertRowId = id;
        changes = 1;
      } else if (s.startsWith('UPDATE daily_notes')) {
        const rows = loadTable('daily_notes');
        const idx = rows.findIndex((r) => r.id === params[2]);
        if (idx >= 0) {
          rows[idx] = { ...rows[idx], log_date: params[0], text: params[1] };
          saveTable('daily_notes', rows);
          changes = 1;
        }
      } else if (s.startsWith('DELETE FROM daily_notes')) {
        const rows = loadTable('daily_notes').filter((r) => r.id !== params[0]);
        saveTable('daily_notes', rows);
        changes = 1;
      }

      return { lastInsertRowId, changes };
    },

    async getAllAsync<T = Row>(sql: string, params: (string | number | null)[] = []): Promise<T[]> {
      const s = sql.trim();
      if (s.includes('FROM periods')) {
        let rows = loadTable('periods');
        if (s.includes('WHERE id = ?')) {
          rows = rows.filter((r) => r.id === params[0]);
        } else if (s.includes('WHERE start_date <= ?')) {
          const date = String(params[0]);
          rows = rows.filter(
            (r) =>
              String(r.start_date) <= date &&
              (r.end_date == null || String(r.end_date) >= date),
          );
        }
        if (s.includes('ORDER BY created_at DESC')) {
          rows = [...rows].sort((a, b) => (b.created_at as number) - (a.created_at as number));
        }
        return rows as T[];
      }
      if (s.includes('FROM symptom_logs')) {
        let rows = loadTable('symptom_logs');
        if (s.includes('WHERE id = ?')) {
          rows = rows.filter((r) => r.id === params[0]);
        } else if (s.includes('WHERE log_date = ?')) {
          rows = rows.filter((r) => r.log_date === params[0]);
        }
        if (s.includes('ORDER BY created_at DESC')) {
          rows = [...rows].sort((a, b) => (b.created_at as number) - (a.created_at as number));
        }
        return rows as T[];
      }
      if (s.includes('FROM daily_notes')) {
        let rows = loadTable('daily_notes');
        if (s.includes('WHERE id = ?')) {
          rows = rows.filter((r) => r.id === params[0]);
        } else if (s.includes('WHERE log_date = ?')) {
          rows = rows.filter((r) => r.log_date === params[0]);
        }
        if (s.includes('ORDER BY created_at DESC')) {
          rows = [...rows].sort((a, b) => (b.created_at as number) - (a.created_at as number));
        }
        return rows as T[];
      }
      return [];
    },

    async getFirstAsync<T = Row>(sql: string, params: (string | number | null)[] = []): Promise<T | null> {
      const rows = await this.getAllAsync<T>(sql, params);
      return rows.length > 0 ? rows[0] : null;
    },
  };
}

let dbInstance: WebDb | null = null;

export async function getDb(): Promise<WebDb> {
  if (!dbInstance) {
    dbInstance = createWebDb();
  }
  return dbInstance;
}

const normalize = (value: string) => value.trim().toLowerCase();

const symptomKeyByLabel: Record<string, string> = {
  cramps: 'cramps',
  krämpfe: 'cramps',
  kramp: 'cramps',
  headache: 'headache',
  kopfschmerzen: 'headache',
  'baş ağrısı': 'headache',
  bloating: 'bloating',
  blähungen: 'bloating',
  şişkinlik: 'bloating',
  fatigue: 'fatigue',
  müdigkeit: 'fatigue',
  yorgunluk: 'fatigue',
  nausea: 'nausea',
  übelkeit: 'nausea',
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
  ängstlich: 'anxious',
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
  const rows = await db.getAllAsync<{ id: number; symptoms: string; moods: string }>(
    'SELECT id, symptoms, moods FROM symptom_logs;',
  );
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

export async function deleteAllData() {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM periods;
    DELETE FROM symptom_logs;
    DELETE FROM daily_notes;
  `);
}
