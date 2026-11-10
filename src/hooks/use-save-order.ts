import { useState } from 'react';

import { useToast } from '@/components/toast';
import { numberSetting } from '@/db/meta';
import { billOrder, createOrder, updateOrderLines } from '@/db/orders';
import { useI18n } from '@/i18n';
import { notify } from '@/lib/confirm';
import { successFeedback } from '@/lib/haptics';
import { triggerBackgroundSync } from '@/lib/sync-engine';
import { useCart } from '@/providers/cart';
import { useDb, useRevalidateAll, useSettings } from '@/providers/database';

/** Saves the current draft as a new order or as changes to the order being edited. */
export function useSaveOrder() {
  const db = useDb();
  const settings = useSettings();
  const cart = useCart();
  const revalidateAll = useRevalidateAll();
  const toast = useToast();
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);

  const save = async ({ bill }: { bill: boolean }): Promise<string | null> => {
    const { draft } = cart;
    if (draft.lines.length === 0) return null;
    if (draft.type === 'dine_in' && !draft.tableId) {
      notify(t('pos.chooseTable'));
      return null;
    }
    setSaving(true);
    try {
      const meta = { customer_name: draft.customerName.trim() || null, note: draft.note.trim() || null };
      let id = draft.orderId;
      if (id) {
        await updateOrderLines(db, id, draft.lines, meta);
      } else {
        id = await createOrder(
          db,
          { type: draft.type, table_id: draft.tableId, lines: draft.lines, ...meta },
          {
            dayStartHour: numberSetting(settings.dayStartHour, 6),
            taxPercent: settings.gstin?.trim() ? numberSetting(settings.taxPercent, 0) : 0,
          },
        );
      }
      if (bill) await billOrder(db, id);
      successFeedback();
      toast({ message: draft.orderId ? t('pos.updated') : t('pos.saved') });
      // Takeaway counters usually ring up the next takeaway; tables change every order.
      cart.reset(!draft.orderId && draft.type === 'takeaway');
      await revalidateAll();
      triggerBackgroundSync(db, settings).catch(() => {});
      return id;
    } catch (error) {
      notify(t('set.error'), error instanceof Error ? error.message : undefined);
      return null;
    } finally {
      setSaving(false);
    }
  };

  return { save, saving };
}
