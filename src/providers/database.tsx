import { createContext, type ReactNode, use, useCallback } from 'react';
import { Platform } from 'react-native';
import useSWR, { SWRConfig, type SWRConfiguration, useSWRConfig } from 'swr';

import { openDatabase } from '@/db/driver';
import { getSettings, type Settings } from '@/db/meta';
import { migrate } from '@/db/schema';
import type { Database } from '@/db/types';

type Boot = { db: Database; settings: Settings };

let bootPromise: Promise<Boot> | null = null;

async function boot(): Promise<Boot> {
  const db = await openDatabase('muster.db');
  await migrate(db);

  return { db, settings: await getSettings(db) };
}

const DatabaseContext = createContext<Database | null>(null);

const swrOptions: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  keepPreviousData: true,
};

function getBootPromise(): Promise<Boot> {
  if (!bootPromise) {
    bootPromise = boot().catch((err) => {
      bootPromise = null;
      throw err;
    });
  }
  return bootPromise;
}

/** Suspends until SQLite is open and migrated. Wrap in <Suspense>. */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const { db, settings } = use(getBootPromise());

  return (
    <DatabaseContext value={db}>
      <SWRConfig value={{ ...swrOptions, fallback: { settings } }}>{children}</SWRConfig>
    </DatabaseContext>
  );
}

export function useDb() {
  const db = use(DatabaseContext);
  if (!db) throw new Error('useDb must be used inside DatabaseProvider');
  return db;
}

export function useDbQuery<T>(key: string | readonly unknown[] | null, query: (db: Database) => Promise<T>) {
  const db = useDb();
  return useSWR(key, () => query(db));
}

/** Re-runs every query on screen after a write. */
export function useRevalidateAll() {
  const { mutate } = useSWRConfig();
  return useCallback(() => mutate(() => true), [mutate]);
}

export function useSettings() {
  const { data } = useDbQuery('settings', getSettings);
  return data as Settings;
}
