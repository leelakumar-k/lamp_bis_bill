import { randomUUID } from 'expo-crypto';

import type { Database, Worker, WorkerInput } from './types';

export function listWorkers(db: Database, includeInactive = true) {
  return db.all<Worker>(
    `SELECT * FROM workers ${includeInactive ? '' : 'WHERE is_active = 1'}
     ORDER BY is_active DESC, first_name COLLATE NOCASE, last_name COLLATE NOCASE`,
  );
}

export function getWorker(db: Database, id: string) {
  return db.first<Worker>('SELECT * FROM workers WHERE id = ?', [id]);
}

export async function listProfessions(db: Database) {
  const rows = await db.all<{ profession: string }>(
    'SELECT DISTINCT profession FROM workers ORDER BY profession COLLATE NOCASE',
  );
  return rows.map((r) => r.profession);
}

export async function isMobileTaken(db: Database, mobile: string, exceptId?: string) {
  const row = await db.first<{ id: string }>(
    'SELECT id FROM workers WHERE mobile = ? AND id != ?',
    [mobile, exceptId ?? ''],
  );
  return row !== null;
}

export async function createWorker(db: Database, input: WorkerInput, id: string = randomUUID()) {
  await db.run(
    `INSERT INTO workers (id, first_name, last_name, mobile, address, profession, daily_wage, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.first_name,
      input.last_name,
      input.mobile,
      input.address,
      input.profession,
      input.daily_wage,
      input.is_active ? 1 : 0,
    ],
  );
  return id;
}

export async function updateWorker(db: Database, id: string, input: WorkerInput) {
  await db.run(
    `UPDATE workers SET first_name = ?, last_name = ?, mobile = ?, address = ?, profession = ?,
       daily_wage = ?, is_active = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [
      input.first_name,
      input.last_name,
      input.mobile,
      input.address,
      input.profession,
      input.daily_wage,
      input.is_active ? 1 : 0,
      id,
    ],
  );
}

/** Removes the worker with their attendance, payments (via cascade) and local-script names. */
export async function deleteWorker(db: Database, id: string) {
  await db.transaction(async () => {
    await db.run('DELETE FROM translations WHERE key = ?', [`worker:${id}`]);
    await db.run('DELETE FROM attendance WHERE worker_id = ?', [id]);
    await db.run('DELETE FROM payments WHERE worker_id = ?', [id]);
    await db.run('DELETE FROM workers WHERE id = ?', [id]);
  });
}

export function fullName(worker: { first_name: string; last_name: string | null }) {
  return [worker.first_name, worker.last_name].filter(Boolean).join(' ');
}
