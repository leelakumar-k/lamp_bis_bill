import { randomUUID } from 'expo-crypto';

import { nowLocal } from '@/lib/date';

import {
  MAX_QTY,
  type Order,
  type OrderDetail,
  type OrderLine,
  type OrderType,
  type OrderWithTable,
  type PaymentMode,
  type Totals,
} from './pos-types';
import { ensureOpenShift } from './shifts';
import type { Database } from './types';

/** GST is charged on the discounted amount; the total is rounded to the nearest rupee. */
export function computeTotals(lines: OrderLine[], discount: number, taxPercent: number): Totals {
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const safeDiscount = Math.min(Math.max(0, discount), subtotal);
  const tax = Math.round(((subtotal - safeDiscount) * taxPercent) / 100);
  const exact = subtotal - safeDiscount + tax;
  const total = Math.round(exact / 100) * 100;
  return { subtotal, discount: safeDiscount, tax, round_off: total - exact, total };
}

function validateLines(lines: OrderLine[]) {
  if (lines.length === 0) throw new Error('An order needs at least one item.');
  for (const l of lines) {
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > MAX_QTY) throw new Error(`Quantity must be 1–${MAX_QTY}.`);
    if (!Number.isInteger(l.price) || l.price < 0) throw new Error('Invalid price.');
  }
}

const ORDER_SELECT = `
  SELECT o.*, t.name AS table_name, s.name AS shift_name,
    (SELECT COALESCE(SUM(qty), 0) FROM order_items WHERE order_id = o.id) AS item_count
  FROM orders o
  JOIN shifts s ON s.id = o.shift_id
  LEFT JOIN dining_tables t ON t.id = o.table_id`;

async function insertLines(db: Database, orderId: string, lines: OrderLine[]) {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    await db.run(
      `INSERT INTO order_items (id, order_id, item_id, category_id, name, category_name, price, qty, note, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), orderId, l.item_id, l.category_id, l.name, l.category_name, l.price, l.qty, l.note, i],
    );
  }
}

/** Next free sharing label for a table: A, B, C… */
async function nextParty(db: Database, tableId: string) {
  const rows = await db.all<{ party: string | null }>(
    "SELECT party FROM orders WHERE table_id = ? AND status IN ('open', 'billed')",
    [tableId],
  );
  const used = new Set(rows.map((r) => r.party ?? 'A'));
  for (let i = 0; i < 26; i++) {
    const label = String.fromCharCode(65 + i);
    if (!used.has(label)) return label;
  }
  return String(rows.length + 1);
}

export type NewOrder = {
  type: OrderType;
  table_id: string | null;
  customer_name: string | null;
  note: string | null;
  lines: OrderLine[];
};

export async function createOrder(
  db: Database,
  input: NewOrder,
  options: { dayStartHour: number; taxPercent: number },
) {
  validateLines(input.lines);
  if (input.type === 'dine_in' && !input.table_id) throw new Error('Choose a table.');
  const id = randomUUID();

  await db.transaction(async () => {
    const shift = await ensureOpenShift(db, options.dayStartHour);
    let token: number | null = null;
    if (input.type === 'takeaway') {
      const row = await db.first<{ n: number }>(
        "SELECT COALESCE(MAX(token), 0) + 1 AS n FROM orders WHERE business_date = ? AND type = 'takeaway'",
        [shift.business_date],
      );
      token = row?.n ?? 1;
    }
    const party = input.type === 'dine_in' && input.table_id ? await nextParty(db, input.table_id) : null;
    const totals = computeTotals(input.lines, 0, options.taxPercent);
    const now = nowLocal();
    await db.run(
      `INSERT INTO orders (id, shift_id, business_date, type, table_id, party, token, status, customer_name, note,
         tax_percent, subtotal, discount, tax, round_off, total, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, shift.id, shift.business_date, input.type, input.type === 'dine_in' ? input.table_id : null, party,
        token, input.customer_name, input.note, options.taxPercent, totals.subtotal, totals.discount, totals.tax,
        totals.round_off, totals.total, now, now,
      ],
    );
    await insertLines(db, id, input.lines);
  });

  return id;
}

async function recompute(db: Database, orderId: string) {
  const order = await db.first<Order>('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) return;
  const lines = await getLines(db, orderId);
  const totals = computeTotals(lines, order.discount, order.tax_percent);
  await db.run(
    `UPDATE orders SET subtotal = ?, discount = ?, tax = ?, round_off = ?, total = ?, updated_at = ? WHERE id = ?`,
    [totals.subtotal, totals.discount, totals.tax, totals.round_off, totals.total, nowLocal(), orderId],
  );
}

/**
 * Replaces the items of an existing order. Editing an order that was already billed
 * or paid bumps its revision so the reprinted bill is marked as revised.
 */
export async function updateOrderLines(
  db: Database,
  orderId: string,
  lines: OrderLine[],
  meta: { customer_name: string | null; note: string | null },
) {
  validateLines(lines);
  await db.transaction(async () => {
    const order = await db.first<Order>('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) throw new Error('Order not found.');
    if (order.status === 'cancelled') throw new Error('This order was cancelled.');
    await db.run('DELETE FROM order_items WHERE order_id = ?', [orderId]);
    await insertLines(db, orderId, lines);
    const revised = order.status === 'billed' || order.status === 'paid';
    await db.run('UPDATE orders SET revision = revision + ?, customer_name = ?, note = ? WHERE id = ?', [
      revised ? 1 : 0,
      meta.customer_name,
      meta.note,
      orderId,
    ]);
    await recompute(db, orderId);
  });
}

export async function setDiscount(db: Database, orderId: string, discount: number) {
  await db.transaction(async () => {
    await db.run('UPDATE orders SET discount = ? WHERE id = ?', [Math.max(0, Math.round(discount)), orderId]);
    await recompute(db, orderId);
  });
}

async function assignBillNo(db: Database, order: Order) {
  if (order.bill_no) return order.bill_no;
  const row = await db.first<{ n: number }>(
    'SELECT COALESCE(MAX(bill_no), 0) + 1 AS n FROM orders WHERE business_date = ?',
    [order.business_date],
  );
  const billNo = row?.n ?? 1;
  await db.run('UPDATE orders SET bill_no = ? WHERE id = ?', [billNo, order.id]);
  return billNo;
}

/** Bill numbers restart every business day and are assigned once, when first billed. */
export async function billOrder(db: Database, orderId: string) {
  await db.transaction(async () => {
    const order = await db.first<Order>('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order || order.status === 'cancelled') return;
    await assignBillNo(db, order);
    if (order.status === 'open') {
      await db.run("UPDATE orders SET status = 'billed', billed_at = ?, updated_at = ? WHERE id = ?", [
        nowLocal(),
        nowLocal(),
        orderId,
      ]);
    }
  });
}

export async function payOrder(db: Database, orderId: string, mode: PaymentMode) {
  await db.transaction(async () => {
    const order = await db.first<Order>('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order || order.status === 'cancelled') return;
    await assignBillNo(db, order);
    const now = nowLocal();
    await db.run(
      `UPDATE orders SET status = 'paid', payment_mode = ?, paid_at = ?, billed_at = COALESCE(billed_at, ?),
         updated_at = ? WHERE id = ?`,
      [mode, now, now, now, orderId],
    );
  });
}

export async function cancelOrder(db: Database, orderId: string) {
  await db.run("UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?", [nowLocal(), orderId]);
}

/** Moves an order to another table, taking the next free sharing label there. */
export async function moveOrder(db: Database, orderId: string, tableId: string) {
  await db.transaction(async () => {
    const party = await nextParty(db, tableId);
    await db.run(
      "UPDATE orders SET type = 'dine_in', table_id = ?, party = ?, token = NULL, updated_at = ? WHERE id = ?",
      [tableId, party, nowLocal(), orderId],
    );
  });
}

export async function deleteOrderLine(db: Database, orderId: string, lineId: string) {
  await db.transaction(async () => {
    await db.run('DELETE FROM order_items WHERE order_id = ? AND id = ?', [orderId, lineId]);
    const remaining = await db.all<{ id: string }>('SELECT id FROM order_items WHERE order_id = ?', [orderId]);
    if (remaining.length === 0) {
      await cancelOrder(db, orderId);
    } else {
      await recompute(db, orderId);
    }
  });
}

export const getLines = (db: Database, orderId: string) =>
  db.all<OrderLine>(
    `SELECT id, item_id, category_id, name, category_name, price, qty, note
     FROM order_items WHERE order_id = ? ORDER BY position`,
    [orderId],
  );

export async function getOrder(db: Database, id: string): Promise<OrderDetail | null> {
  const order = await db.first<OrderWithTable>(`${ORDER_SELECT} WHERE o.id = ?`, [id]);
  if (!order) return null;
  return { ...order, lines: await getLines(db, id) };
}

/** Orders still on the floor: running (open) or billed but not yet paid. */
export const listActiveOrders = (db: Database) =>
  db.all<OrderWithTable>(`${ORDER_SELECT} WHERE o.status IN ('open', 'billed') ORDER BY o.created_at`);

export async function listActiveOrdersWithLines(db: Database): Promise<OrderDetail[]> {
  const orders = await listActiveOrders(db);
  const result: OrderDetail[] = [];
  for (const o of orders) {
    const lines = await getLines(db, o.id);
    result.push({ ...o, lines });
  }
  return result;
}

export type OrderFilter = { from: string; to: string; shiftId?: string | null };

export const listOrders = (db: Database, { from, to, shiftId }: OrderFilter) =>
  db.all<OrderWithTable>(
    `${ORDER_SELECT} WHERE o.business_date BETWEEN ? AND ? AND (? IS NULL OR o.shift_id = ?)
     ORDER BY o.created_at DESC`,
    [from, to, shiftId ?? null, shiftId ?? null],
  );
