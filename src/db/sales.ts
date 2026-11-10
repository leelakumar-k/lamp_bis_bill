import type { PaymentMode, Shift } from './pos-types';
import type { Database, SqlParam } from './types';

/** Billed and paid orders count as sales; open and cancelled orders do not. */
const SOLD = "o.status IN ('billed', 'paid')";

export type SalesRange = { from: string; to: string; shiftId: string | null };

const where = ({ from, to, shiftId }: SalesRange): [string, SqlParam[]] => [
  `${SOLD} AND o.business_date BETWEEN ? AND ? AND (? IS NULL OR o.shift_id = ?)`,
  [from, to, shiftId, shiftId],
];

export type SalesSummary = {
  orders: number;
  gross: number;
  discount: number;
  tax: number;
  net: number;
  dine_in: number;
  takeaway: number;
  cancelled: number;
};

export async function salesSummary(db: Database, range: SalesRange): Promise<SalesSummary> {
  const [clause, params] = where(range);
  const row = await db.first<Omit<SalesSummary, 'cancelled'>>(
    `SELECT COUNT(*) AS orders, COALESCE(SUM(subtotal), 0) AS gross, COALESCE(SUM(discount), 0) AS discount,
       COALESCE(SUM(tax), 0) AS tax, COALESCE(SUM(total), 0) AS net,
       COALESCE(SUM(CASE WHEN type = 'dine_in' THEN total END), 0) AS dine_in,
       COALESCE(SUM(CASE WHEN type = 'takeaway' THEN total END), 0) AS takeaway
     FROM orders o WHERE ${clause}`,
    params,
  );
  const cancelled = await db.first<{ n: number }>(
    `SELECT COUNT(*) AS n FROM orders o WHERE o.status = 'cancelled' AND o.business_date BETWEEN ? AND ?
       AND (? IS NULL OR o.shift_id = ?)`,
    [range.from, range.to, range.shiftId, range.shiftId],
  );
  return {
    orders: row?.orders ?? 0,
    gross: row?.gross ?? 0,
    discount: row?.discount ?? 0,
    tax: row?.tax ?? 0,
    net: row?.net ?? 0,
    dine_in: row?.dine_in ?? 0,
    takeaway: row?.takeaway ?? 0,
    cancelled: cancelled?.n ?? 0,
  };
}

export type Slice = { key: string; label: string; value: number; qty?: number };

/** Item amounts are before discount and tax, so category shares add up to gross sales. */
export async function salesByCategory(db: Database, range: SalesRange): Promise<Slice[]> {
  const [clause, params] = where(range);
  return db.all<Slice>(
    `SELECT COALESCE(oi.category_id, oi.category_name) AS key, oi.category_name AS label,
       SUM(oi.price * oi.qty) AS value, SUM(oi.qty) AS qty
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE ${clause} GROUP BY key ORDER BY value DESC`,
    params,
  );
}

export async function topItems(db: Database, range: SalesRange, limit = 8): Promise<Slice[]> {
  const [clause, params] = where(range);
  return db.all<Slice>(
    `SELECT COALESCE(oi.item_id, oi.name) AS key, oi.name AS label, SUM(oi.price * oi.qty) AS value, SUM(oi.qty) AS qty
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE ${clause} GROUP BY key ORDER BY qty DESC, value DESC LIMIT ?`,
    [...params, limit],
  );
}

export async function salesByPayment(db: Database, range: SalesRange) {
  const [clause, params] = where(range);
  return db.all<{ key: PaymentMode | 'unpaid'; value: number; orders: number }>(
    `SELECT COALESCE(payment_mode, 'unpaid') AS key, SUM(total) AS value, COUNT(*) AS orders
     FROM orders o WHERE ${clause} GROUP BY key ORDER BY value DESC`,
    params,
  );
}

export type ShiftTotal = Shift & { orders: number; net: number; cash: number; upi: number; card: number; unpaid: number };

export async function salesByShift(db: Database, from: string, to: string) {
  return db.all<ShiftTotal>(
    `SELECT s.*,
       COUNT(o.id) AS orders,
       COALESCE(SUM(o.total), 0) AS net,
       COALESCE(SUM(CASE WHEN o.payment_mode = 'cash' THEN o.total END), 0) AS cash,
       COALESCE(SUM(CASE WHEN o.payment_mode = 'upi' THEN o.total END), 0) AS upi,
       COALESCE(SUM(CASE WHEN o.payment_mode = 'card' THEN o.total END), 0) AS card,
       COALESCE(SUM(CASE WHEN o.status = 'billed' THEN o.total END), 0) AS unpaid
     FROM shifts s LEFT JOIN orders o ON o.shift_id = s.id AND ${SOLD}
     WHERE s.business_date BETWEEN ? AND ?
     GROUP BY s.id ORDER BY s.opened_at DESC`,
    [from, to],
  );
}

export async function getShiftTotal(db: Database, shiftId: string) {
  const shift = await db.first<{ business_date: string }>('SELECT business_date FROM shifts WHERE id = ?', [shiftId]);
  if (!shift) return null;
  const rows = await salesByShift(db, shift.business_date, shift.business_date);
  return rows.find((r) => r.id === shiftId) ?? null;
}

/** Sales per clock hour, ordered from the business day start so night shifts read left to right. */
export async function salesByHour(db: Database, range: SalesRange, dayStartHour: number) {
  const [clause, params] = where(range);
  const rows = await db.all<{ hour: number; value: number; orders: number }>(
    `SELECT CAST(substr(o.created_at, 12, 2) AS INTEGER) AS hour, SUM(o.total) AS value, COUNT(*) AS orders
     FROM orders o WHERE ${clause} GROUP BY hour`,
    params,
  );
  const byHour = new Map(rows.map((r) => [r.hour, r]));
  return Array.from({ length: 24 }, (_, i) => {
    const hour = (dayStartHour + i) % 24;
    return { hour, value: byHour.get(hour)?.value ?? 0, orders: byHour.get(hour)?.orders ?? 0 };
  });
}
