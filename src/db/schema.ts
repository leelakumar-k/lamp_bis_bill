import type { Database } from './types';

// Each entry upgrades the schema by one version. Never edit a shipped migration;
// append a new one so existing installs upgrade in place.
const migrations: string[] = [
  `
  CREATE TABLE IF NOT EXISTS workers (
    id          TEXT PRIMARY KEY NOT NULL,
    first_name  TEXT NOT NULL,
    last_name   TEXT,
    mobile      TEXT UNIQUE,
    profession  TEXT NOT NULL DEFAULT 'Worker',
    daily_wage  INTEGER NOT NULL CHECK (daily_wage >= 0),
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS attendance (
    worker_id       TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    date            TEXT NOT NULL,
    status          INTEGER NOT NULL CHECK (status BETWEEN 0 AND 3),
    wage_snapshot   INTEGER NOT NULL,
    overtime_hours  REAL NOT NULL DEFAULT 0,
    note            TEXT,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (worker_id, date)
  ) WITHOUT ROWID;

  CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

  CREATE TABLE IF NOT EXISTS payments (
    id         TEXT PRIMARY KEY NOT NULL,
    worker_id  TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    amount     INTEGER NOT NULL CHECK (amount > 0),
    type       TEXT NOT NULL CHECK (type IN ('advance', 'settlement')),
    paid_on    TEXT NOT NULL,
    note       TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_payments_worker_date ON payments(worker_id, paid_on);

  CREATE TABLE IF NOT EXISTS app_meta (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );
  `,
  // User-edited translations. A row overrides the built-in text for one language;
  // deleting the row restores the default. Keys: UI string keys, 'profession:<English>',
  // and 'worker:<id>' for names written in a local script.
  `
  CREATE TABLE IF NOT EXISTS translations (
    lang        TEXT NOT NULL,
    key         TEXT NOT NULL,
    value       TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (lang, key)
  ) WITHOUT ROWID;
  `,
  // Restaurant billing. Money is integer minor units; datetimes are local
  // 'YYYY-MM-DD HH:MM:SS'. Every order belongs to a shift and carries the shift's
  // business date, so a night shift (8 PM to 5 AM) bills on the date it started.
  `
  CREATE TABLE IF NOT EXISTS categories (
    id          TEXT PRIMARY KEY NOT NULL,
    name        TEXT NOT NULL,
    sort        INTEGER NOT NULL DEFAULT 0,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS items (
    id            TEXT PRIMARY KEY NOT NULL,
    category_id   TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name          TEXT NOT NULL,
    price         INTEGER NOT NULL CHECK (price >= 0),
    image         TEXT,
    is_veg        INTEGER NOT NULL DEFAULT 1,
    is_available  INTEGER NOT NULL DEFAULT 1,
    sort          INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id, sort);

  CREATE TABLE IF NOT EXISTS dining_tables (
    id         TEXT PRIMARY KEY NOT NULL,
    name       TEXT NOT NULL UNIQUE,
    seats      INTEGER NOT NULL DEFAULT 4 CHECK (seats > 0),
    sort       INTEGER NOT NULL DEFAULT 0,
    is_active  INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id             TEXT PRIMARY KEY NOT NULL,
    business_date  TEXT NOT NULL,
    name           TEXT NOT NULL,
    opened_at      TEXT NOT NULL,
    closed_at      TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(business_date);

  CREATE TABLE IF NOT EXISTS orders (
    id             TEXT PRIMARY KEY NOT NULL,
    shift_id       TEXT NOT NULL REFERENCES shifts(id),
    business_date  TEXT NOT NULL,
    type           TEXT NOT NULL CHECK (type IN ('dine_in', 'takeaway')),
    table_id       TEXT REFERENCES dining_tables(id) ON DELETE SET NULL,
    party          TEXT,
    token          INTEGER,
    bill_no        INTEGER,
    status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'billed', 'paid', 'cancelled')),
    customer_name  TEXT,
    note           TEXT,
    tax_percent    REAL NOT NULL DEFAULT 0,
    subtotal       INTEGER NOT NULL DEFAULT 0,
    discount       INTEGER NOT NULL DEFAULT 0,
    tax            INTEGER NOT NULL DEFAULT 0,
    round_off      INTEGER NOT NULL DEFAULT 0,
    total          INTEGER NOT NULL DEFAULT 0,
    payment_mode   TEXT CHECK (payment_mode IN ('cash', 'upi', 'card')),
    revision       INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    billed_at      TEXT,
    paid_at        TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_orders_shift ON orders(shift_id);
  CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(business_date, status);
  CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id, status);

  CREATE TABLE IF NOT EXISTS order_items (
    id             TEXT PRIMARY KEY NOT NULL,
    order_id       TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_id        TEXT,
    category_id    TEXT,
    name           TEXT NOT NULL,
    category_name  TEXT NOT NULL DEFAULT '',
    price          INTEGER NOT NULL,
    qty            INTEGER NOT NULL CHECK (qty BETWEEN 1 AND 99),
    note           TEXT,
    position       INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id, position);
  `,
  // Migration 3: Add parent_id to dining_tables to support sub-tables
  `
  ALTER TABLE dining_tables ADD COLUMN parent_id TEXT REFERENCES dining_tables(id) ON DELETE SET NULL;
  `,
  // Migration 4: Add address to workers
  `
  ALTER TABLE workers ADD COLUMN address TEXT;
  `,
  // Migration 5: Add index for case-insensitive item name lookups
  `
  CREATE INDEX IF NOT EXISTS idx_items_name_nocase ON items(name COLLATE NOCASE);
  `,
  // Migration 6: Add synced column to orders for cloud sync
  `
  ALTER TABLE orders ADD COLUMN synced INTEGER NOT NULL DEFAULT 0;
  CREATE INDEX IF NOT EXISTS idx_orders_synced ON orders(synced, status);
  `,
];

export async function migrate(db: Database) {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let version = current; version < migrations.length; version++) {
    await db.transaction(async () => {
      try {
        await db.exec(migrations[version]);
      } catch (err: any) {
        // If column or index already exists, safely skip and bump version
        const msg = String(err?.message || '').toLowerCase();
        if (!msg.includes('duplicate column') && !msg.includes('already exists')) {
          throw err;
        }
      }
      await db.exec(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
