import type { Database, SqlParam } from './types';

// The browser build is only used for previewing the UI. expo-sqlite on web needs
// cross-origin isolation (SharedArrayBuffer), which embedded previews can't provide,
// so we run the same SQL through sql.js and keep a snapshot in localStorage.
const SQL_JS_VERSION = '1.13.0';
const CDN = `https://cdn.jsdelivr.net/npm/sql.js@${SQL_JS_VERSION}/dist/`;

type SqlJsStatement = {
  bind(params: SqlParam[]): void;
  step(): boolean;
  getAsObject(): Record<string, unknown>;
  free(): void;
};
type SqlJsDatabase = {
  run(sql: string, params?: SqlParam[]): void;
  exec(sql: string): void;
  prepare(sql: string): SqlJsStatement;
  getRowsModified(): number;
  export(): Uint8Array;
};
type SqlJsStatic = { Database: new (data?: Uint8Array) => SqlJsDatabase };

declare global {
  interface Window {
    initSqlJs?: (config: { locateFile: (file: string) => string }) => Promise<SqlJsStatic>;
  }
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function toBase64(bytes: Uint8Array) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function openDatabase(name: string): Promise<Database> {
  if (!window.initSqlJs) await loadScript(`${CDN}sql-wasm.js`);
  const SQL = await window.initSqlJs!({ locateFile: (file) => `${CDN}${file}` });

  const storageKey = `sqlite:${name}`;
  const saved = localStorage.getItem(storageKey);
  const db = new SQL.Database(saved ? fromBase64(saved) : undefined);
  db.exec('PRAGMA foreign_keys = ON;');

  let depth = 0;
  let persistTimer: ReturnType<typeof setTimeout> | undefined;
  const persist = () => {
    if (depth > 0) return;
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, toBase64(db.export()));
      } catch {
        // Storage quota exceeded; the preview keeps working in memory.
      }
    }, 250);
  };

  const query = <T>(sql: string, params: SqlParam[]) => {
    const stmt = db.prepare(sql);
    try {
      stmt.bind(params);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  };

  return {
    exec: async (sql) => {
      db.exec(sql);
      persist();
    },
    run: async (sql, params = []) => {
      db.run(sql, params);
      const changes = db.getRowsModified();
      persist();
      return { changes };
    },
    all: async (sql, params = []) => query(sql, params),
    first: async (sql, params = []) => query<never>(sql, params)[0] ?? null,
    transaction: async (task) => {
      db.exec('BEGIN');
      depth++;
      try {
        await task();
        depth--;
        db.exec('COMMIT');
      } catch (error) {
        depth--;
        db.exec('ROLLBACK');
        throw error;
      }
      persist();
    },
  };
}
