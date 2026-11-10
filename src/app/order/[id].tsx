import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DiscountModal } from '@/components/pos/discount-modal';
import { ReceiptPreview } from '@/components/pos/receipt-preview';
import { TablePicker } from '@/components/pos/table-picker';
import { useToast } from '@/components/toast';
import { Button, IconButton } from '@/components/ui/button';
import { Card, EmptyState, SectionTitle } from '@/components/ui/primitives';
import { Content, Screen, ScreenHeader } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { billOrder, cancelOrder, deleteOrderLine, getOrder, moveOrder, payOrder, setDiscount } from '@/db/orders';
import type { PaymentMode } from '@/db/pos-types';
import { useOrderActions } from '@/hooks/use-order-actions';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/i18n';
import { confirm } from '@/lib/confirm';
import { formatTime, receiptDate, receiptDateTime } from '@/lib/date';
import { successFeedback } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';
import { goBack } from '@/lib/navigation';
import { orderLabel } from '@/lib/order-label';
import { buildOrderReceipt } from '@/lib/receipt';
import { triggerBackgroundSync } from '@/lib/sync-engine';
import { useDb, useDbQuery, useRevalidateAll, useSettings } from '@/providers/database';
import { radius, useTheme } from '@/theme';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const settings = useSettings();
  const revalidateAll = useRevalidateAll();
  const toast = useToast();
  const { t, itemName, locale } = useI18n();
  const { colors } = useTheme();
  const { gutter, isWide } = useResponsive();
  const actions = useOrderActions();

  const [pickingTable, setPickingTable] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { data: order, isLoading } = useDbQuery(['order', id], (d) => getOrder(d, id));

  if (!order) {
    return (
      <Screen>
        <ScreenHeader back title="" />
        {isLoading ? null : <EmptyState icon="receipt-outline" title={t('ord.notFound')} />}
      </Screen>
    );
  }

  const label = orderLabel(order, t);
  const isSettled = order.status === 'paid' || order.status === 'cancelled';
  const receiptModel = buildOrderReceipt(order, { settings, kind: 'bill', itemName });

  const recordPayment = async (mode: PaymentMode) => {
    await payOrder(db, order.id, mode);
    successFeedback();
    await revalidateAll();
    toast({ message: t('ord.paidToast') });
    triggerBackgroundSync(db, settings).catch(() => {});
  };

  const handleGenerateBill = async () => {
    await billOrder(db, order.id);
    successFeedback();
    await revalidateAll();
    toast({ message: t('ord.billed') });
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: t('ord.cancelTitle'),
      message: t('ord.cancelBody'),
      confirmLabel: t('ord.cancel'),
      cancelLabel: t('form.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await cancelOrder(db, order.id);
    await revalidateAll();
  };

  const handleMove = async (tableId: string) => {
    await moveOrder(db, order.id, tableId);
    setPickingTable(false);
    successFeedback();
    await revalidateAll();
  };

  const handleApplyDiscount = async (minor: number) => {
    await setDiscount(db, order.id, minor);
    await revalidateAll();
    toast({ message: minor > 0 ? 'Discount applied' : 'Discount removed' });
  };

  const handleDeleteLine = async (lineId: string, dishName: string) => {
    const ok = await confirm({
      title: 'Remove item?',
      message: `Delete ${dishName} from this order?`,
      confirmLabel: t('form.delete'),
      cancelLabel: t('form.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await deleteOrderLine(db, order.id, lineId);
    toast({ message: `${dishName} removed` });
    await revalidateAll();
  };

  const statusBadge = () => {
    const tone =
      order.status === 'paid'
        ? { bg: colors.primarySoft, fg: colors.primary }
        : order.status === 'billed'
          ? { bg: colors.accentSoft, fg: colors.accent }
          : order.status === 'cancelled'
            ? { bg: colors.dangerSoft, fg: colors.danger }
            : { bg: colors.surfaceMuted, fg: colors.textMuted };
    return (
      <View style={[styles.badge, { backgroundColor: tone.bg }]}>
        <Text variant="caption" style={{ color: tone.fg, fontWeight: '700' }}>
          {t(`ord.${order.status}`)}
        </Text>
      </View>
    );
  };

  const infoSection = (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <Text variant="heading">{label}</Text>
          <Text variant="caption" tone="muted">
            {order.type === 'dine_in' ? t('pos.dineIn') : t('pos.takeaway')} · {receiptDate(order.business_date)}
            {order.bill_no ? ` · ${t('ord.billNo', { no: order.bill_no })}` : ''}
            {order.revision ? ` · ${t('ord.revised')} ${order.revision}` : ''}
          </Text>
        </View>
        {statusBadge()}
      </View>

      <View style={styles.metaGrid}>
        <Text variant="caption" tone="muted">
          {t('ord.orderedAt', { time: formatTime(order.created_at, locale) })}
        </Text>
        {order.billed_at ? (
          <Text variant="caption" tone="muted">
            {t('ord.billed')}: {formatTime(order.billed_at, locale)}
          </Text>
        ) : null}
        {order.paid_at ? (
          <Text variant="caption" tone="muted">
            {t('ord.paid')}: {formatTime(order.paid_at, locale)} ({order.payment_mode?.toUpperCase()})
          </Text>
        ) : null}
        {order.customer_name ? (
          <Text variant="caption" tone="muted">
            {t('pos.customer')}: {order.customer_name}
          </Text>
        ) : null}
        {order.note ? (
          <Text variant="caption" tone="muted">
            {t('pos.note')}: {order.note}
          </Text>
        ) : null}
      </View>
    </Card>
  );

  const itemsSection = (
    <Card style={styles.card}>
      <SectionTitle>{t('ord.items')}</SectionTitle>
      {order.lines.map((line, idx) => {
        const name = itemName(line.item_id, line.name);
        return (
          <View
            key={`${line.item_id ?? line.name}-${idx}`}
            style={[
              styles.lineRow,
              idx < order.lines.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
            ]}>
            <View style={styles.flex}>
              <Text variant="bodyStrong">{name}</Text>
              <Text variant="caption" tone="muted">
                {formatMoney(line.price, settings.currency)} × {line.qty}
                {line.note ? ` · ${line.note}` : ''}
              </Text>
            </View>
            <Text variant="bodyStrong" numeric style={{ marginHorizontal: 8 }}>
              {formatMoney(line.price * line.qty, settings.currency)}
            </Text>
            {!isSettled && line.id ? (
              <IconButton
                icon="trash-outline"
                variant="danger"
                label={t('form.delete')}
                onPress={() => handleDeleteLine(line.id!, name)}
              />
            ) : null}
          </View>
        );
      })}

      <View style={styles.totalsWrap}>
        <View style={styles.totalLine}>
          <Text tone="muted">{t('ord.subtotal')}</Text>
          <Text numeric tone="muted">
            {formatMoney(order.subtotal, settings.currency)}
          </Text>
        </View>

        {order.discount > 0 ? (
          <Pressable
            style={styles.totalLine}
            onPress={() => setEditingDiscount(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text tone="muted">{t('ord.discount')}</Text>
              <Ionicons name="pencil-outline" size={14} color={colors.primary} />
            </View>
            <Text numeric tone="muted">
              -{formatMoney(order.discount, settings.currency)}
            </Text>
          </Pressable>
        ) : null}

        {settings.gstin?.trim() && order.tax_percent > 0 ? (
          <View style={styles.totalLine}>
            <Text tone="muted">{t('ord.tax', { rate: order.tax_percent })}</Text>
            <Text numeric tone="muted">
              {formatMoney(order.tax, settings.currency)}
            </Text>
          </View>
        ) : null}

        {order.round_off !== 0 ? (
          <View style={styles.totalLine}>
            <Text tone="muted">{t('ord.roundOff')}</Text>
            <Text numeric tone="muted">
              {formatMoney(order.round_off, settings.currency)}
            </Text>
          </View>
        ) : null}

        <View style={[styles.totalLine, styles.grandTotal]}>
          <Text variant="heading">{t('ord.total')}</Text>
          <Text variant="title" numeric>
            {formatMoney(
              settings.gstin?.trim() ? order.total : order.subtotal - order.discount,
              settings.currency,
            )}
          </Text>
        </View>
      </View>
    </Card>
  );

  const paymentButtons =
    order.status === 'open' || order.status === 'billed' ? (
      <Card style={styles.card}>
        <SectionTitle>{t('ord.payWith')}</SectionTitle>
        <View style={styles.payOptions}>
          <Button
            label={t('ord.cash')}
            icon="cash-outline"
            size="lg"
            variant="primary"
            onPress={() => recordPayment('cash')}
            style={styles.flex}
          />
          <Button
            label={t('ord.upi')}
            icon="qr-code-outline"
            size="lg"
            variant="primary"
            onPress={() => recordPayment('upi')}
            style={styles.flex}
          />
          <Button
            label={t('ord.card')}
            icon="card-outline"
            size="lg"
            variant="primary"
            onPress={() => recordPayment('card')}
            style={styles.flex}
          />
        </View>
      </Card>
    ) : null;

  const actionsSection = (
    <Card style={styles.card}>
      <SectionTitle>{t('ord.history')}</SectionTitle>
      <View style={styles.buttonStack}>
        {order.status === 'open' ? (
          <Button
            label={t('ord.bill')}
            icon="receipt-outline"
            variant="primary"
            size="lg"
            onPress={handleGenerateBill}
            fullWidth
          />
        ) : null}

        <View style={styles.buttonRow}>
          <Button
            label={t('ord.printBill')}
            icon="print-outline"
            variant="secondary"
            onPress={() => actions.print(order.id, 'bill', 'print')}
            style={styles.flex}
          />
          <Button
            label={t('prn.share')}
            icon="share-outline"
            variant="secondary"
            onPress={() => actions.print(order.id, 'bill', 'share')}
            style={styles.flex}
          />
          <Button
            label={t('ord.printKot')}
            icon="restaurant-outline"
            variant="secondary"
            onPress={() => actions.print(order.id, 'kot', 'print')}
            style={styles.flex}
          />
        </View>

        {!isSettled ? (
          <View style={styles.buttonRow}>
            <Button
              label={t('ord.edit')}
              icon="create-outline"
              variant="secondary"
              onPress={() => actions.edit(order)}
              style={styles.flex}
            />
            {order.type === 'dine_in' ? (
              <Button
                label={t('ord.move')}
                icon="swap-horizontal-outline"
                variant="secondary"
                onPress={() => setPickingTable(true)}
                style={styles.flex}
              />
            ) : null}
            <Button
              label={order.discount > 0 ? `${t('ord.discount')} (${formatMoney(order.discount, settings.currency)})` : t('ord.discount')}
              icon="pricetag-outline"
              variant="secondary"
              onPress={() => setEditingDiscount(true)}
              style={styles.flex}
            />
          </View>
        ) : null}

        <Button
          label={showPreview ? t('common.close') : t('prn.preview')}
          icon="eye-outline"
          variant="ghost"
          onPress={() => setShowPreview((p) => !p)}
          fullWidth
        />

        {order.status !== 'cancelled' ? (
          <Button
            label={t('ord.cancel')}
            icon="trash-outline"
            variant="danger"
            onPress={handleCancel}
            fullWidth
          />
        ) : null}
      </View>
    </Card>
  );

  return (
    <Screen>
      <ScreenHeader back title={label} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 64 }}>
        <Content style={styles.body}>
          {isWide ? (
            <View style={styles.split}>
              <View style={styles.flex}>
                {infoSection}
                {itemsSection}
              </View>
              <View style={styles.sidePane}>
                {paymentButtons}
                {actionsSection}
                {showPreview ? <ReceiptPreview model={receiptModel} accessibilityLabel={t('prn.preview')} /> : null}
              </View>
            </View>
          ) : (
            <>
              {infoSection}
              {paymentButtons}
              {itemsSection}
              {actionsSection}
              {showPreview ? <ReceiptPreview model={receiptModel} accessibilityLabel={t('prn.preview')} /> : null}
            </>
          )}
        </Content>
      </ScrollView>

      <TablePicker
        visible={pickingTable}
        selectedId={order.table_id}
        onClose={() => setPickingTable(false)}
        onSelect={handleMove}
        title={t('ord.move')}
      />

      <DiscountModal
        visible={editingDiscount}
        onClose={() => setEditingDiscount(false)}
        onApply={handleApplyDiscount}
        subtotalMinor={order.subtotal}
        currentDiscountMinor={order.discount}
        currency={settings.currency}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16 },
  card: { padding: 16, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  metaGrid: { gap: 4, paddingTop: 4 },
  lineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, gap: 8 },
  totalsWrap: { gap: 6, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandTotal: { paddingTop: 6 },
  payOptions: { flexDirection: 'row', gap: 8 },
  buttonStack: { gap: 8 },
  buttonRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  split: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  sidePane: { width: 380, gap: 16 },
});