import { type AttendanceRow, type Database, Status } from './types';

/** Active workers for a day, plus anyone already marked on that day (e.g. since deactivated). */
export function getAttendanceForDate(db: Database, date: string) {
  return db.all<AttendanceRow>(
    `SELECT w.id AS worker_id, w.first_name, w.last_name, w.profession, w.daily_wage,
            a.status, a.wage_snapshot
     FROM workers w
     LEFT JOIN attendance a ON a.worker_id = w.id AND a.date = ?
     WHERE w.is_active = 1 OR a.status IS NOT NULL
     ORDER BY w.first_name COLLATE NOCASE, w.last_name COLLATE NOCASE`,
    [date],
  );
}

export async function setStatus(db: Database, workerId: string, date: string, status: Status | null) {
  if (status === null) {
    await db.run('DELETE FROM attendance WHERE worker_id = ? AND date = ?', [workerId, date]);
    return;
  }
  // The wage is captured once per day, so later wage changes don't rewrite history.
  await db.run(
    `INSERT INTO attendance (worker_id, date, status, wage_snapshot)
     SELECT id, ?, ?, daily_wage FROM workers WHERE id = ?
     ON CONFLICT (worker_id, date) DO UPDATE SET status = excluded.status, updated_at = datetime('now')`,
    [date, status, workerId],
  );
}

export async function unmarkedWorkerIds(db: Database, date: string) {
  const rows = await db.all<{ id: string }>(
    `SELECT id FROM workers WHERE is_active = 1
     AND id NOT IN (SELECT worker_id FROM attendance WHERE date = ?)`,
    [date],
  );
  return rows.map((r) => r.id);
}

/** Marks every unmarked active worker. Returns the affected ids so the action can be undone. */
export async function markRemaining(db: Database, date: string, status: Status) {
  const ids = await unmarkedWorkerIds(db, date);
  if (ids.length === 0) return ids;
  await db.run(
    `INSERT INTO attendance (worker_id, date, status, wage_snapshot)
     SELECT id, ?, ?, daily_wage FROM workers WHERE is_active = 1
     AND id NOT IN (SELECT worker_id FROM attendance WHERE date = ?)`,
    [date, status, date],
  );
  return ids;
}

/** Copies statuses from another day onto workers not yet marked today. */
export async function copyFromDate(db: Database, fromDate: string, toDate: string) {
  const rows = await db.all<{ worker_id: string }>(
    `SELECT a.worker_id FROM attendance a JOIN workers w ON w.id = a.worker_id
     WHERE a.date = ? AND w.is_active = 1
     AND a.worker_id NOT IN (SELECT worker_id FROM attendance WHERE date = ?)`,
    [fromDate, toDate],
  );
  if (rows.length === 0) return [];
  await db.run(
    `INSERT INTO attendance (worker_id, date, status, wage_snapshot)
     SELECT a.worker_id, ?, a.status, w.daily_wage
     FROM attendance a JOIN workers w ON w.id = a.worker_id
     WHERE a.date = ? AND w.is_active = 1
     AND a.worker_id NOT IN (SELECT worker_id FROM attendance WHERE date = ?)`,
    [toDate, fromDate, toDate],
  );
  return rows.map((r) => r.worker_id);
}

export async function clearStatuses(db: Database, date: string, workerIds: string[]) {
  if (workerIds.length === 0) return;
  await db.transaction(async () => {
    for (const id of workerIds) {
      await db.run('DELETE FROM attendance WHERE worker_id = ? AND date = ?', [id, date]);
    }
  });
}

export function getWorkerMonth(db: Database, workerId: string, start: string, end: string) {
  return db.all<{ date: string; status: Status; wage_snapshot: number }>(
    'SELECT date, status, wage_snapshot FROM attendance WHERE worker_id = ? AND date BETWEEN ? AND ? ORDER BY date',
    [workerId, start, end],
  );
}

export function dayFactor(status: Status | null) {
  if (status === Status.Present) return 1;
  if (status === Status.HalfDay) return 0.5;
  return 0;
}
