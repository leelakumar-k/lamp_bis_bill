import type { Database } from './types';

export type ThemePreference = 'system' | 'light' | 'dark';

export type PaperWidth = '58' | '80';
export type ReceiptLanguage = 'en' | 'app';

// Stored as strings in app_meta; numeric values are parsed where used.
export type Settings = {
  theme: ThemePreference;
  currency: string;
  businessName: string;
  language: string;
  /** Hour (0-23) when a new business day begins. Orders before it belong to the previous day. */
  dayStartHour: string;
  taxPercent: string;
  paperWidth: PaperWidth;
  receiptLanguage: ReceiptLanguage;
  address: string;
  phone: string;
  gstin: string;
  receiptFooter: string;
  bluetoothPrinterAddress: string;
  bluetoothPrinterName: string;
};

export const defaultSettings: Settings = {
  theme: 'system',
  currency: '₹',
  businessName: '',
  language: 'en',
  dayStartHour: '6',
  taxPercent: '5',
  paperWidth: '58',
  receiptLanguage: 'en',
  address: '',
  phone: '',
  gstin: '',
  receiptFooter: 'Thank you! Visit again',
  bluetoothPrinterAddress: '',
  bluetoothPrinterName: '',
};

export const numberSetting = (value: string, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export async function getSettings(db: Database): Promise<Settings> {
  const rows = await db.all<{ key: string; value: string | null }>(
    "SELECT key, value FROM app_meta WHERE key LIKE 'setting.%'",
  );
  const settings = { ...defaultSettings };
  for (const { key, value } of rows) {
    const name = key.slice('setting.'.length) as keyof Settings;
    if (name in settings && value !== null) (settings as Record<string, string>)[name] = value;
  }
  return settings;
}

export async function setSetting<K extends keyof Settings>(db: Database, key: K, value: Settings[K]) {
  await db.run(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    [`setting.${key}`, value],
  );
}
