import { randomUUID } from 'expo-crypto';

import type { Category, DiningTable, MenuItem, MenuItemInput } from './pos-types';
import type { Database } from './types';

export const listCategories = (db: Database) =>
  db.all<Category>('SELECT id, name, sort, is_active FROM categories ORDER BY sort, name');

export const listItems = (db: Database) =>
  db.all<MenuItem>(
    `SELECT i.id, i.category_id, i.name, i.price, i.image, i.is_veg, i.is_available, i.sort
     FROM items i JOIN categories c ON c.id = i.category_id
     ORDER BY c.sort, i.sort, i.name`,
  );

export const getItem = (db: Database, id: string) =>
  db.first<MenuItem>('SELECT * FROM items WHERE id = ?', [id]);

export async function saveCategory(db: Database, name: string, id?: string) {
  if (id) {
    await db.run('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
    return id;
  }
  const next = await db.first<{ n: number }>('SELECT COALESCE(MAX(sort), 0) + 1 AS n FROM categories');
  const newId = randomUUID();
  await db.run('INSERT INTO categories (id, name, sort) VALUES (?, ?, ?)', [newId, name, next?.n ?? 1]);
  return newId;
}

export async function moveCategory(db: Database, id: string, direction: -1 | 1) {
  const all = await listCategories(db);
  const index = all.findIndex((c) => c.id === id);
  const swap = all[index + direction];
  if (index < 0 || !swap) return;
  await db.transaction(async () => {
    for (let i = 0; i < all.length; i++) {
      const c = i === index ? swap : i === index + direction ? all[index] : all[i];
      await db.run('UPDATE categories SET sort = ? WHERE id = ?', [i + 1, c.id]);
    }
  });
}

export async function deleteCategory(db: Database, id: string) {
  const count = await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM items WHERE category_id = ?', [id]);
  if ((count?.n ?? 0) > 0) return false;
  await db.run('DELETE FROM categories WHERE id = ?', [id]);
  return true;
}

export async function saveItem(db: Database, input: MenuItemInput, id?: string) {
  const values = [
    input.category_id,
    input.name,
    input.price,
    input.image,
    input.is_veg ? 1 : 0,
    input.is_available ? 1 : 0,
  ];
  if (id) {
    await db.run(
      `UPDATE items SET category_id = ?, name = ?, price = ?, image = ?, is_veg = ?, is_available = ?,
         updated_at = datetime('now') WHERE id = ?`,
      [...values, id],
    );
    return id;
  }
  const newId = randomUUID();
  const next = await db.first<{ n: number }>(
    'SELECT COALESCE(MAX(sort), 0) + 1 AS n FROM items WHERE category_id = ?',
    [input.category_id],
  );
  await db.run(
    `INSERT INTO items (id, category_id, name, price, image, is_veg, is_available, sort)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [newId, ...values, next?.n ?? 1],
  );
  return newId;
}

export async function setItemAvailable(db: Database, id: string, available: boolean) {
  await db.run("UPDATE items SET is_available = ?, updated_at = datetime('now') WHERE id = ?", [available ? 1 : 0, id]);
}

/** Past bills keep their own copy of name and price, so deleting an item never changes them. */
export async function deleteItem(db: Database, id: string) {
  await db.transaction(async () => {
    await db.run('UPDATE order_items SET item_id = NULL WHERE item_id = ?', [id]);
    await db.run('DELETE FROM items WHERE id = ?', [id]);
    await db.run("DELETE FROM translations WHERE key = ?", [`item:${id}`]);
  });
}

export const listTables = (db: Database) =>
  db.all<DiningTable>(
    `SELECT t.id, t.name, t.seats, t.sort, t.is_active, t.parent_id, p.name AS parent_name
     FROM dining_tables t
     LEFT JOIN dining_tables p ON p.id = t.parent_id
     WHERE t.is_active = 1
     ORDER BY COALESCE(t.parent_id, t.id), t.parent_id IS NOT NULL, t.sort, t.name`,
  );

export async function saveTable(db: Database, name: string, seats: number, id?: string, parentId?: string | null) {
  if (id) {
    await db.run('UPDATE dining_tables SET name = ?, seats = ?, parent_id = ? WHERE id = ?', [
      name,
      seats,
      parentId ?? null,
      id,
    ]);
    return id;
  }
  const next = await db.first<{ n: number }>('SELECT COALESCE(MAX(sort), 0) + 1 AS n FROM dining_tables');
  const newId = randomUUID();
  await db.run('INSERT INTO dining_tables (id, name, seats, sort, parent_id) VALUES (?, ?, ?, ?, ?)', [
    newId,
    name,
    seats,
    next?.n ?? 1,
    parentId ?? null,
  ]);
  return newId;
}

export async function isItemNameTaken(db: Database, name: string, exceptId?: string) {
  const row = await db.first<{ id: string; name: string; price: number; category_id: string }>(
    'SELECT id, name, price, category_id FROM items WHERE trim(name) = trim(?) COLLATE NOCASE AND id != ?',
    [name.trim(), exceptId ?? ''],
  );
  return row;
}

export async function isTableNameTaken(db: Database, name: string, exceptId?: string) {
  const row = await db.first<{ id: string }>(
    'SELECT id FROM dining_tables WHERE name = ? COLLATE NOCASE AND id != ? AND is_active = 1',
    [name, exceptId ?? ''],
  );
  return row !== null;
}

/** Tables with past orders are hidden instead of deleted so old bills keep their table name. */
export async function deleteTable(db: Database, id: string) {
  const open = await db.first<{ n: number }>(
    `SELECT COUNT(*) AS n FROM orders
     WHERE (table_id = ? OR table_id IN (SELECT id FROM dining_tables WHERE parent_id = ?))
       AND status IN ('open', 'billed')`,
    [id, id],
  );
  if ((open?.n ?? 0) > 0) return false;
  await db.transaction(async () => {
    await db.run('UPDATE dining_tables SET parent_id = NULL WHERE parent_id = ?', [id]);
    await db.run("UPDATE dining_tables SET is_active = 0, name = name || ' (' || id || ')' WHERE id = ?", [id]);
  });
  return true;
}
