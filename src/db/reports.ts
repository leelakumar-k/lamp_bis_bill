import type { Database, WorkerMonthSummary } from './types';

// Present = full wage, half-day = half wage, overtime paid at the hourly rate of an 8-hour day.
const EARNED_EXPR = `
  CASE a.status WHEN 1 THEN a.wage_snapshot WHEN 2 THEN a.wage_snapshot / 2.0 ELSE 0 END
  + a.overtime_hours * a.wage_snapshot / 8.0`;

export function monthSummary(db: Database, start: string, end: string) {
  return db.all<WorkerMonthSummary>(
    `SELECT w.id AS worker_id, w.first_name, w.last_name, w.profession,
       COALESCE(att.days_worked, 0) AS days_worked,
       COALESCE(att.absent, 0) AS absent,
       COALESCE(att.leave, 0) AS leave,
       COALESCE(att.earned, 0) AS earned,
       COALESCE(pay.paid, 0) AS paid
     FROM workers w
     LEFT JOIN (
       SELECT a.worker_id,
         SUM(CASE a.status WHEN 1 THEN 1 WHEN 2 THEN 0.5 ELSE 0 END) AS days_worked,
         SUM(a.status = 0) AS absent,
         SUM(a.status = 3) AS leave,
         ROUND(SUM(${EARNED_EXPR})) AS earned
       FROM attendance a WHERE a.date BETWEEN ? AND ? GROUP BY a.worker_id
     ) att ON att.worker_id = w.id
     LEFT JOIN (
       SELECT worker_id, SUM(amount) AS paid FROM payments
       WHERE paid_on BETWEEN ? AND ? GROUP BY worker_id
     ) pay ON pay.worker_id = w.id
     WHERE w.is_active = 1 OR att.worker_id IS NOT NULL OR pay.worker_id IS NOT NULL
     ORDER BY earned DESC, w.first_name COLLATE NOCASE`,
    [start, end, start, end],
  );
}

export type WorkerBalance = { earned: number; paid: number; balance: number };

/** All-time balance: everything earned minus everything paid out. */
export async function workerBalance(db: Database, workerId: string): Promise<WorkerBalance> {
  const row = await db.first<{ earned: number | null; paid: number | null }>(
    `SELECT
       (SELECT ROUND(SUM(${EARNED_EXPR})) FROM attendance a WHERE a.worker_id = ?) AS earned,
       (SELECT SUM(amount) FROM payments WHERE worker_id = ?) AS paid`,
    [workerId, workerId],
  );
  const earned = row?.earned ?? 0;
  const paid = row?.paid ?? 0;
  return { earned, paid, balance: earned - paid };
}
