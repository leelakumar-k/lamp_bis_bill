import { isMobileTaken } from './workers';
import { type Database, Status } from './types';

type Row = Record<string, string | number | null>;

// Insert order respects foreign keys; deletes run in reverse.
const TABLES = [
  'workers',
  'attendance',
  'payments',
  'translations',
  'categories',
  'items',
  'dining_tables',
  'shifts',
  'orders',
  'order_items',
] as const;

type TableName = (typeof TABLES)[number];

export type Backup = {
  app: 'muster';
  version: 2;
  exported_at: string;
  tables: Partial<Record<TableName, Row[]>>;
};

export async function createBackup(db: Database): Promise<Backup> {
  const tables: Backup['tables'] = {};
  for (const name of TABLES) tables[name] = await db.all<Row>(`SELECT * FROM ${name}`);
  return { app: 'muster', version: 2, exported_at: new Date().toISOString(), tables };
}

export function parseBackup(text: string): Backup {
  const data = JSON.parse(text) as Record<string, unknown>;
  if (data.app !== 'muster') throw new Error('This file is not a Muster backup.');
  // Version 1 backups (attendance only) stored each table at the top level.
  if (data.version === 1) {
    return {
      app: 'muster',
      version: 2,
      exported_at: String(data.exported_at ?? ''),
      tables: {
        workers: (data.workers as Row[]) ?? [],
        attendance: (data.attendance as Row[]) ?? [],
        payments: (data.payments as Row[]) ?? [],
        translations: (data.translations as Row[]) ?? [],
      },
    };
  }
  if (data.version !== 2 || typeof data.tables !== 'object' || data.tables === null) {
    throw new Error('This backup was made by a newer version of the app.');
  }
  return data as unknown as Backup;
}

async function clearAll(db: Database) {
  for (const name of [...TABLES].reverse()) await db.exec(`DELETE FROM ${name};`);
}

/** Replaces all data with the backup contents in a single transaction. */
export async function restoreBackup(db: Database, backup: Backup) {
  await db.transaction(async () => {
    await clearAll(db);
    for (const name of TABLES) {
      for (const row of backup.tables[name] ?? []) {
        const columns = Object.keys(row);
        if (columns.some((c) => !/^\w+$/.test(c))) throw new Error('Invalid backup file.');
        await db.run(
          `INSERT INTO ${name} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
          columns.map((c) => row[c]),
        );
      }
    }
  });
}

export async function deleteAllData(db: Database) {
  await db.transaction(() => clearAll(db));
}

function normalizeDate(value: string) {
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const match = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return null;
}

function normalizeStatus(value: string): Status {
  const v = value.trim().toLowerCase();
  if (['p', '1', 'y', 'yes', 'true', 'present'].includes(v)) return Status.Present;
  if (['h', 'half', 'half-day', 'halfday', '0.5'].includes(v)) return Status.HalfDay;
  if (['l', 'leave'].includes(v)) return Status.Leave;
  return Status.Absent;
}

const clean = (value: string | undefined) => {
  const v = (value ?? '').trim();
  return v === '' || v === 'None' ? null : v;
};

export type ImportResult = { imported: number; skipped: number };

/**
 * Imports the attendance text files written by the previous KivyMD app.
 * Line format: present,date,daily_wage,profession,mobile,last_name,first_name,id
 */
export async function importLegacyAttendance(db: Database, text: string): Promise<ImportResult> {
  let imported = 0;
  let skipped = 0;

  await db.transaction(async () => {
    for (const rawLine of text.split(/\r?\n/)) {
      if (rawLine.trim() === '') continue;
      const fields = rawLine.split(',');
      const date = normalizeDate(fields[1] ?? '');
      const wage = Number.parseFloat(fields[2] ?? '');
      const legacyId = clean(fields[7]);
      const firstName = clean(fields[6]);
      if (fields.length < 8 || !date || !Number.isFinite(wage) || wage < 0 || !legacyId || !firstName) {
        skipped++;
        continue;
      }

      const workerId = `legacy-${legacyId}`;
      const wageMinor = Math.round(wage * 100);
      let mobile = clean(fields[4]);
      if (mobile && (await isMobileTaken(db, mobile, workerId))) mobile = null;

      await db.run(
        `INSERT INTO workers (id, first_name, last_name, mobile, profession, daily_wage)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET first_name = excluded.first_name, last_name = excluded.last_name,
           mobile = COALESCE(excluded.mobile, workers.mobile), updated_at = datetime('now')`,
        [workerId, firstName, clean(fields[5]), mobile, clean(fields[3]) ?? 'Worker', wageMinor],
      );
      await db.run(
        `INSERT INTO attendance (worker_id, date, status, wage_snapshot) VALUES (?, ?, ?, ?)
         ON CONFLICT (worker_id, date) DO UPDATE SET status = excluded.status,
           wage_snapshot = excluded.wage_snapshot, updated_at = datetime('now')`,
        [workerId, date, normalizeStatus(fields[0] ?? ''), wageMinor],
      );
      imported++;
    }
  });

  return { imported, skipped };
}
