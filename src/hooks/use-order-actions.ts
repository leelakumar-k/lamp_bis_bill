import { router } from 'expo-router';

import { billOrder, getOrder } from '@/db/orders';
import type { OrderDetail } from '@/db/pos-types';
import { useI18n } from '@/i18n';
import { confirm, notify } from '@/lib/confirm';
import { orderLabel } from '@/lib/order-label';
import { shareReceipt } from '@/lib/print';
import { buildOrderReceipt } from '@/lib/receipt';
import { useCart } from '@/providers/cart';
import { useDb, useRevalidateAll, useSettings } from '@/providers/database';
import { usePrinter } from '@/providers/printer-context';

export function useOrderActions() {
  const db = useDb();
  const settings = useSettings();
  const cart = useCart();
  const revalidateAll = useRevalidateAll();
  const { t, itemName } = useI18n();
  const { printBill } = usePrinter();

  /** Unsaved items in the current draft are only discarded after confirmation. */
  const confirmDiscard = async () => {
    if (cart.draft.lines.length === 0) return true;
    return confirm({
      title: t('pos.discardTitle'),
      confirmLabel: t('common.confirm'),
      cancelLabel: t('form.cancel'),
      destructive: true,
    });
  };

  const startAt = async (tableId: string | null) => {
    if (!(await confirmDiscard())) return;
    cart.reset();
    cart.setTarget(tableId ? 'dine_in' : 'takeaway', tableId);
    router.navigate('/');
  };

  const edit = async (order: OrderDetail) => {
    if (cart.draft.orderId !== order.id && !(await confirmDiscard())) return;
    cart.load(order, orderLabel(order, t));
    router.navigate('/');
  };

  const print = async (orderId: string, kind: 'bill' | 'kot', mode: 'print' | 'share' = 'print') => {
    try {
      if (kind === 'bill') await billOrder(db, orderId);
      const order = await getOrder(db, orderId);
      if (!order) return;
      const model = buildOrderReceipt(order, { settings, kind, itemName });
      if (mode === 'share') await shareReceipt(model, `${kind}-${order.business_date}-${order.bill_no ?? order.token ?? ''}`);
      else await printBill(model);
    } catch (error) {
      notify(t('set.error'), error instanceof Error ? error.message : undefined);
    } finally {
      revalidateAll();
    }
  };

  return { startAt, edit, print };
}
