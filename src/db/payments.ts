import { randomUUID } from 'expo-crypto';

import type { Database, Payment, PaymentType } from './types';

export function listPayments(db: Database, workerId: string) {
  return db.all<Payment>(
    'SELECT * FROM payments WHERE worker_id = ? ORDER BY paid_on DESC, created_at DESC',
    [workerId],
  );
}

export async function addPayment(
  db: Database,
  input: { worker_id: string; amount: number; type: PaymentType; paid_on: string; note: string | null },
) {
  const id = randomUUID();
  await db.run(
    'INSERT INTO payments (id, worker_id, amount, type, paid_on, note) VALUES (?, ?, ?, ?, ?, ?)',
    [id, input.worker_id, input.amount, input.type, input.paid_on, input.note],
  );
  return id;
}

export async function deletePayment(db: Database, id: string) {
  await db.run('DELETE FROM payments WHERE id = ?', [id]);
}
