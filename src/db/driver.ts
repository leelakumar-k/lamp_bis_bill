import * as SQLite from 'expo-sqlite';

import type { Database } from './types';

export async function openDatabase(name: string): Promise<Database> {
  const db = await SQLite.openDatabaseAsync(name);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params = []) => {
      const result = await db.runAsync(sql, params);
      return { changes: result.changes };
    },
    all: (sql, params = []) => db.getAllAsync(sql, params),
    first: (sql, params = []) => db.getFirstAsync(sql, params),
    transaction: (task) => db.withTransactionAsync(task),
  };
}
