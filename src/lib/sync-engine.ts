import type { Settings } from '@/db/meta';
import { setSetting } from '@/db/meta';
import { getShiftTotal, salesSummary } from '@/db/sales';
import { getOpenShift } from '@/db/shifts';
import type { Database } from '@/db/types';

export type SyncResult = {
  success: boolean;
  message: string;
  syncedCount?: number;
};

/**
 * Pings the backend microservice /health endpoint with a 3s timeout.
 */
export async function checkServerConnection(serverUrl: string): Promise<boolean> {
  const cleanUrl = serverUrl.replace(/\/+$/, '');
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${cleanUrl}/health`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Registers restaurant customer on backend.
 * Generates unique non-sequential 9-character customer_id and checks duplicates.
 */
export async function registerCustomerOnServer(
  serverUrl: string,
  params: {
    businessName: string;
    phone: string;
    email?: string;
    location: string;
    plan?: string;
  },
): Promise<{ success: boolean; customer?: any; error?: string }> {
  const cleanUrl = serverUrl.replace(/\/+$/, '');
  try {
    const res = await fetch(`${cleanUrl}/api/customers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: params.businessName.trim(),
        phone: params.phone.trim(),
        email: params.email?.trim() || null,
        location: params.location.trim(),
        plan: params.plan || 'super',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.detail || 'Registration failed' };
    }
    return { success: true, customer: data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Could not connect to server' };
  }
}

/**
 * Activates or renews a license code.
 * Adds 365 days + any leftover remaining days.
 */
export async function activateLicenseOnServer(
  serverUrl: string,
  customerId: string,
  licenseCode: string,
): Promise<{ success: boolean; customer?: any; error?: string }> {
  const cleanUrl = serverUrl.replace(/\/+$/, '');
  try {
    const res = await fetch(`${cleanUrl}/api/licenses/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: customerId.trim(),
        license_code: licenseCode.trim(),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.detail || 'License activation failed' };
    }
    return { success: true, customer: data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Could not connect to server' };
  }
}

/**
 * Syncs daily shift summary report to server (Gold and Premium plans).
 */
export async function syncDailySummaryToServer(
  db: Database,
  settings: Settings,
): Promise<SyncResult> {
  if (settings.plan === 'super') {
    return { success: true, message: 'Super plan: data stored locally on device only.' };
  }

  if (!settings.customerId?.trim()) {
    return { success: false, message: 'Customer ID not registered with server.' };
  }

  const cleanUrl = settings.serverUrl.replace(/\/+$/, '');
  try {
    const shift = await getOpenShift(db);
    if (!shift) {
      return { success: true, message: 'No active shift to sync.' };
    }

    const [summary, shiftTotal] = await Promise.all([
      salesSummary(db, { from: shift.business_date, to: shift.business_date, shiftId: shift.id }),
      getShiftTotal(db, shift.id),
    ]);

    const payload = {
      customer_id: settings.customerId.trim(),
      business_date: shift.business_date,
      shift_name: shift.name || 'Default',
      orders_count: summary.orders,
      gross_sales: summary.gross,
      discount_total: summary.discount,
      tax_total: summary.tax,
      round_off_total: 0,
      net_sales: summary.net,
      cash_total: shiftTotal?.cash ?? 0,
      upi_total: shiftTotal?.upi ?? 0,
      card_total: shiftTotal?.card ?? 0,
      unpaid_total: shiftTotal?.unpaid ?? 0,
    };

    const res = await fetch(`${cleanUrl}/api/sync/daily-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      return { success: false, message: err.detail || 'Daily summary sync failed' };
    }

    const now = new Date().toISOString();
    await setSetting(db, 'lastSyncedAt', now);
    return { success: true, message: 'Daily summary synced to server successfully.' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Could not connect to server' };
  }
}

/**
 * Syncs Menu Categories and Items (Premium plan).
 */
export async function syncMenuToServer(db: Database, settings: Settings): Promise<SyncResult> {
  if (settings.plan !== 'premium' || !settings.customerId?.trim()) {
    return { success: true, message: 'Skipped (menu sync is for Premium plan only).' };
  }

  const cleanUrl = settings.serverUrl.replace(/\/+$/, '');
  try {
    const categories = await db.all<{ id: string; name: string; position: number }>(
      'SELECT id, name, position FROM categories ORDER BY position ASC',
    );
    const items = await db.all<{ id: string; category_id: string | null; name: string; price: number; is_active: number }>(
      'SELECT id, category_id, name, price, is_active FROM items',
    );

    const payload = {
      customer_id: settings.customerId.trim(),
      categories: categories.map((c) => ({
        local_id: c.id,
        name: c.name,
        sort_order: c.position,
      })),
      items: items.map((i) => ({
        local_id: i.id,
        category_local_id: i.category_id,
        name: i.name,
        price: i.price,
        is_active: Boolean(i.is_active),
      })),
    };

    const res = await fetch(`${cleanUrl}/api/sync/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      return { success: false, message: err.detail || 'Menu sync failed' };
    }
    return { success: true, message: 'Menu synced successfully.' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Menu sync failed' };
  }
}

/**
 * Syncs pending orders in background batches (Premium plan).
 * Non-blocking and offline-first: If no internet, sales are not impacted.
 */
export async function syncPendingOrdersToServer(
  db: Database,
  settings: Settings,
): Promise<SyncResult> {
  if (settings.plan !== 'premium') {
    return { success: true, message: 'Skipped (order sync is for Premium plan only).' };
  }

  if (!settings.customerId?.trim()) {
    return { success: false, message: 'Customer ID not registered.' };
  }

  const cleanUrl = settings.serverUrl.replace(/\/+$/, '');
  try {
    // Select unsynced settled orders in batches of 30
    const pendingOrders = await db.all<any>(
      `SELECT o.*, t.name as table_name, s.name as shift_name
       FROM orders o
       LEFT JOIN dining_tables t ON o.table_id = t.id
       LEFT JOIN shifts s ON o.shift_id = s.id
       WHERE (o.synced = 0 OR o.synced IS NULL)
         AND o.status IN ('paid', 'billed')
       ORDER BY o.created_at ASC
       LIMIT 30`,
    );

    if (pendingOrders.length === 0) {
      return { success: true, syncedCount: 0, message: 'All orders already synced.' };
    }

    const orderPayloads = [];
    for (const ord of pendingOrders) {
      const lines = await db.all<any>(
        'SELECT item_id, name, price, qty, note FROM order_items WHERE order_id = ?',
        [ord.id],
      );

      orderPayloads.push({
        local_order_id: ord.id,
        bill_no: ord.bill_no,
        token: ord.token,
        type: ord.type,
        status: ord.status,
        business_date: ord.business_date,
        shift_name: ord.shift_name || 'Default',
        table_name: ord.table_name || null,
        customer_name: ord.customer_name || null,
        payment_mode: ord.payment_mode || null,
        subtotal: ord.subtotal,
        discount: ord.discount || 0,
        tax_percent: ord.tax_percent || 0,
        tax: ord.tax || 0,
        round_off: ord.round_off || 0,
        total: ord.total,
        created_at: ord.created_at,
        billed_at: ord.billed_at,
        paid_at: ord.paid_at,
        lines: lines.map((l) => ({
          item_local_id: l.item_id,
          name: l.name,
          price: l.price,
          qty: l.qty,
          note: l.note,
        })),
      });
    }

    const res = await fetch(`${cleanUrl}/api/sync/orders/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: settings.customerId.trim(),
        orders: orderPayloads,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return { success: false, message: err.detail || 'Batch sync failed' };
    }

    const data = await res.json();
    const syncedIds = data.order_ids || [];

    if (syncedIds.length > 0) {
      const placeholders = syncedIds.map(() => '?').join(',');
      await db.run(
        `UPDATE orders SET synced = 1 WHERE id IN (${placeholders})`,
        syncedIds,
      );
    }

    const now = new Date().toISOString();
    await setSetting(db, 'lastSyncedAt', now);

    return {
      success: true,
      syncedCount: syncedIds.length,
      message: `Synced ${syncedIds.length} orders to server.`,
    };
  } catch (e: any) {
    // Non-blocking error handling for offline resilience
    return { success: false, message: e.message || 'Offline: orders queued for later sync.' };
  }
}

/**
 * Triggers background sync matching the active plan:
 * - Super: No-op (100% offline).
 * - Gold: Syncs daily summary.
 * - Premium: Syncs menu and batch orders.
 */
export async function triggerBackgroundSync(db: Database, settings: Settings) {
  if (settings.plan === 'super') return;

  const connected = await checkServerConnection(settings.serverUrl);
  if (!connected) return;

  if (settings.plan === 'gold') {
    await syncDailySummaryToServer(db, settings);
  } else if (settings.plan === 'premium') {
    await syncDailySummaryToServer(db, settings);
    await syncMenuToServer(db, settings);
    await syncPendingOrdersToServer(db, settings);
  }
}

// ----------------- Multi-Counter Change Pull (Premium) -----------------

/**
 * Pulls changes created or updated by other counters (Premium plan).
 * Synchronizes table occupancy and completed orders across devices.
 */
export async function pullRemoteOrderChanges(
  db: Database,
  settings: Settings,
): Promise<{ success: boolean; pulledCount: number }> {
  if (settings.plan !== 'premium' || !settings.customerId?.trim()) {
    return { success: true, pulledCount: 0 };
  }

  const cleanUrl = settings.serverUrl.replace(/\/+$/, '');
  try {
    const lastPull = settings.lastSyncedAt || '';
    const query = lastPull
      ? `?customer_id=${encodeURIComponent(settings.customerId.trim())}&since=${encodeURIComponent(lastPull)}`
      : `?customer_id=${encodeURIComponent(settings.customerId.trim())}`;

    const res = await fetch(`${cleanUrl}/api/sync/orders/changes${query}`);
    if (!res.ok) return { success: false, pulledCount: 0 };

    const data = await res.json();
    const orders = data.orders || [];
    if (orders.length === 0) return { success: true, pulledCount: 0 };

    await db.transaction(async () => {
      for (const o of orders) {
        // If order doesn't exist locally, insert it marked as synced
        const existing = await db.first<{ id: string }>('SELECT id FROM orders WHERE id = ?', [o.local_order_id]);
        if (!existing) {
          const shift = await getOpenShift(db);
          await db.run(
            `INSERT OR IGNORE INTO orders (
               id, shift_id, business_date, type, table_id, party, token, bill_no,
               status, customer_name, note, tax_percent, subtotal, discount, tax,
               round_off, total, payment_mode, synced, created_at, updated_at, billed_at, paid_at
             ) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, NULL, 0, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
            [
              o.local_order_id,
              shift?.id || 'default_shift',
              o.business_date,
              o.type || 'takeaway',
              o.token,
              o.bill_no,
              o.status || 'paid',
              o.customer_name,
              o.subtotal,
              o.discount || 0,
              o.tax || 0,
              o.round_off || 0,
              o.total,
              o.payment_mode,
              o.created_at || new Date().toISOString(),
              o.synced_at || new Date().toISOString(),
              o.billed_at,
              o.paid_at,
            ],
          );

          if (o.lines && o.lines.length > 0) {
            for (const l of o.lines) {
              await db.run(
                `INSERT OR IGNORE INTO order_items (id, order_id, item_id, name, price, qty, note, position)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
                [`item_${o.local_order_id}_${Math.random().toString(36).slice(2, 7)}`, o.local_order_id, l.item_local_id, l.name, l.price, l.qty, l.note],
              );
            }
          }
        }
      }
    });

    return { success: true, pulledCount: orders.length };
  } catch {
    return { success: false, pulledCount: 0 };
  }
}

// ----------------- Auto-Retry Exponential Backoff Sync Daemon -----------------

const BACKOFF_DELAYS = [5000, 15000, 30000, 60000, 120000, 300000]; // 5s, 15s, 30s, 1m, 2m, max 5m
let consecutiveFailures = 0;
let nextRetryTimestamp = 0;

/**
 * Automatically retries sync on an exponential backoff schedule.
 * If offline, increases backoff delay up to 5 minutes without freezing UI.
 * When back online, immediately syncs and resets backoff to 0.
 */
export async function runAutoSyncCycle(
  db: Database,
  settings: Settings,
  onSyncDone?: () => void,
) {
  if (settings.plan === 'super' || !settings.customerId?.trim()) return;

  const now = Date.now();
  if (now < nextRetryTimestamp) {
    return; // Exponential backoff in effect
  }

  const online = await checkServerConnection(settings.serverUrl);
  if (!online) {
    consecutiveFailures++;
    const delayIndex = Math.min(consecutiveFailures - 1, BACKOFF_DELAYS.length - 1);
    nextRetryTimestamp = now + BACKOFF_DELAYS[delayIndex];
    return;
  }

  // Back online! Reset backoff
  consecutiveFailures = 0;
  nextRetryTimestamp = 0;

  try {
    if (settings.plan === 'gold') {
      await syncDailySummaryToServer(db, settings);
    } else if (settings.plan === 'premium') {
      await syncDailySummaryToServer(db, settings);
      await syncMenuToServer(db, settings);
      const pushRes = await syncPendingOrdersToServer(db, settings);
      const pullRes = await pullRemoteOrderChanges(db, settings);
      if ((pushRes.syncedCount && pushRes.syncedCount > 0) || pullRes.pulledCount > 0) {
        onSyncDone?.();
      }
    }
  } catch {
    consecutiveFailures++;
    const delayIndex = Math.min(consecutiveFailures - 1, BACKOFF_DELAYS.length - 1);
    nextRetryTimestamp = now + BACKOFF_DELAYS[delayIndex];
  }
}
