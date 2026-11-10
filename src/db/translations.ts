import type { Database } from './types';

export async function getOverrides(db: Database, lang: string) {
  const rows = await db.all<{ key: string; value: string }>(
    'SELECT key, value FROM translations WHERE lang = ?',
    [lang],
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;
}

export async function setOverride(db: Database, lang: string, key: string, value: string) {
  await db.run(
    `INSERT INTO translations (lang, key, value) VALUES (?, ?, ?)
     ON CONFLICT (lang, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [lang, key, value],
  );
}

export async function deleteOverride(db: Database, lang: string, key: string) {
  await db.run('DELETE FROM translations WHERE lang = ? AND key = ?', [lang, key]);
}

export const workerKey = (id: string) => `worker:${id}`;
export const professionKey = (name: string) => `profession:${name}`;
export const itemKey = (id: string) => `item:${id}`;
export const categoryKey = (id: string) => `category:${id}`;
