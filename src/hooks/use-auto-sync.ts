import { useEffect, useRef } from 'react';
import { runAutoSyncCycle } from '@/lib/sync-engine';
import { useDb, useRevalidateAll, useSettings } from '@/providers/database';

export function useAutoSync() {
  const db = useDb();
  const settings = useSettings();
  const revalidateAll = useRevalidateAll();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (settings.plan === 'super' || !settings.customerId?.trim()) {
      return;
    }

    // Run first sync attempt after 3 seconds on mount
    const initialTimer = setTimeout(() => {
      runAutoSyncCycle(db, settings, () => revalidateAll());
    }, 3000);

    // Periodically run auto-sync every 30 seconds
    timerRef.current = setInterval(() => {
      runAutoSyncCycle(db, settings, () => revalidateAll());
    }, 30000);

    return () => {
      clearTimeout(initialTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [db, settings.customerId, settings.plan, settings.serverUrl]);
}
