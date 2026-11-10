// Amounts are stored as integer minor units (paise/cents) to avoid float rounding.
export function toMinor(input: string): number | null {
  const normalized = input.replace(/[,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

export function minorToInput(minor: number) {
  const major = minor / 100;
  return Number.isInteger(major) ? String(major) : major.toFixed(2);
}

const formatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export function formatMoney(minor: number, symbol: string) {
  const safeMinor = Number.isFinite(minor) ? minor : 0;
  const sign = safeMinor < 0 ? '-' : '';
  return `${sign}${symbol}${formatter.format(Math.abs(safeMinor) / 100)}`;
}
