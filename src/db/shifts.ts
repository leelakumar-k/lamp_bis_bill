import { randomUUID } from 'expo-crypto';

import { businessDateFor, nowLocal } from '@/lib/date';

import type { Shift } from './pos-types';
import type { Database } from './types';

export const getOpenShift = (db: Database) =>
  db.first<Shift>('SELECT * FROM shifts WHERE closed_at IS NULL ORDER BY opened_at DESC LIMIT 1');

export const getShift = (db: Database, id: string) => db.first<Shift>('SELECT * FROM shifts WHERE id = ?', [id]);

/**
 * Opens a shift whose business date is fixed at open time. Everything billed in it
 * (even after midnight) carries that date.
 */
export async function openShift(db: Database, dayStartHour: number, at = new Date()) {
  const businessDate = businessDateFor(at, dayStartHour);
  const count = await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM shifts WHERE business_date = ?', [
    businessDate,
  ]);
  const shift: Shift = {
    id: randomUUID(),
    business_date: businessDate,
    name: `Shift ${(count?.n ?? 0) + 1}`,
    opened_at: nowLocal(),
    closed_at: null,
  };
  await db.run('INSERT INTO shifts (id, business_date, name, opened_at) VALUES (?, ?, ?, ?)', [
    shift.id,
    shift.business_date,
    shift.name,
    shift.opened_at,
  ]);
  return shift;
}

export async function ensureOpenShift(db: Database, dayStartHour: number) {
  return (await getOpenShift(db)) ?? openShift(db, dayStartHour);
}

export async function countUnsettled(db: Database, shiftId: string) {
  const row = await db.first<{ n: number }>(
    "SELECT COUNT(*) AS n FROM orders WHERE shift_id = ? AND status IN ('open', 'billed')",
    [shiftId],
  );
  return row?.n ?? 0;
}

/** Returns false when unpaid orders remain; they must be settled or cancelled first. */
export async function closeShift(db: Database, id: string) {
  if ((await countUnsettled(db, id)) > 0) return false;
  await db.run('UPDATE shifts SET closed_at = ? WHERE id = ? AND closed_at IS NULL', [nowLocal(), id]);
  return true;
}

export const listShifts = (db: Database, from: string, to: string) =>
  db.all<Shift>('SELECT * FROM shifts WHERE business_date BETWEEN ? AND ? ORDER BY opened_at DESC', [from, to]);

export async function renameShift(db: Database, id: string, name: string) {
  await db.run('UPDATE shifts SET name = ? WHERE id = ?', [name, id]);
}
