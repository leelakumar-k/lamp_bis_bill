const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseISODate(iso: string) {
  if (!iso || typeof iso !== 'string') return new Date();
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export const today = () => toISODate(new Date());

export function isISODate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function addDays(iso: string, days: number) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

function safeFormat(date: Date, locale: string, options: Intl.DateTimeFormatOptions) {
  try {
    return date.toLocaleDateString(locale, options);
  } catch {
    return date.toLocaleDateString('en-IN', options);
  }
}

export const formatDay = (iso: string, locale: string) =>
  safeFormat(parseISODate(iso), locale, { weekday: 'long', day: 'numeric', month: 'long' });

export const formatShortDate = (iso: string, locale: string) =>
  safeFormat(parseISODate(iso), locale, { day: 'numeric', month: 'short', year: 'numeric' });

export const formatWeekday = (iso: string, locale: string) =>
  safeFormat(parseISODate(iso), locale, { weekday: 'long' });

export type RelativeDay = 'today' | 'yesterday' | 'tomorrow' | null;

export function relativeDay(iso: string): RelativeDay {
  const now = today();
  if (iso === now) return 'today';
  if (iso === addDays(now, -1)) return 'yesterday';
  if (iso === addDays(now, 1)) return 'tomorrow';
  return null;
}

export type MonthKey = string; // YYYY-MM

export const currentMonth = (): MonthKey => today().slice(0, 7);

export function addMonths(month: MonthKey, delta: number): MonthKey {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function monthRange(month: MonthKey) {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${pad(last)}`, days: last };
}

export function formatMonth(month: MonthKey, locale: string) {
  const [y, m] = month.split('-').map(Number);
  return safeFormat(new Date(y, m - 1, 1), locale, { month: 'long', year: 'numeric' });
}

/** Short weekday names starting Monday, in the given locale. */
export function weekdayInitials(locale: string) {
  // 2024-01-01 was a Monday.
  return Array.from({ length: 7 }, (_, i) =>
    safeFormat(new Date(2024, 0, 1 + i), locale, { weekday: 'narrow' }),
  );
}

/** Local wall-clock time as 'YYYY-MM-DD HH:MM:SS' (what the restaurant sees on the clock). */
export function toLocalDateTime(date: Date) {
  return `${toISODate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export const nowLocal = () => toLocalDateTime(new Date());

export function parseLocalDateTime(value?: string | null) {
  if (!value || typeof value !== 'string') return new Date();
  const [d, t = '00:00:00'] = value.split(' ');
  const [h, m, s] = t.split(':').map(Number);
  const date = parseISODate(d);
  date.setHours(h || 0, m || 0, s || 0);
  return date;
}

/**
 * The business day a moment belongs to. With a 6 AM day start, 2:30 AM on the 8th
 * still belongs to the 7th, so a night shift keeps one date from open to close.
 */
export function businessDateFor(date: Date, dayStartHour: number) {
  const shifted = new Date(date);
  if (date.getHours() < dayStartHour) shifted.setDate(shifted.getDate() - 1);
  return toISODate(shifted);
}

export function formatTime(localDateTime: string, locale: string) {
  try {
    return parseLocalDateTime(localDateTime).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return localDateTime.slice(11, 16);
  }
}

/** Fixed, locale-independent formats for thermal receipts. */
export const receiptDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
export const receiptDateTime = (local: string) => `${receiptDate(local.slice(0, 10))} ${local.slice(11, 16)}`;

export function minutesSince(localDateTime: string) {
  return Math.max(0, Math.round((Date.now() - parseLocalDateTime(localDateTime).getTime()) / 60000));
}

/** Monday-first weekday index (0 = Monday). */
export function weekdayMondayFirst(iso: string) {
  return (parseISODate(iso).getDay() + 6) % 7;
}
