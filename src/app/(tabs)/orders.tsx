import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TableChairLayout } from '@/components/pos/table-chair-layout';
import { Button, IconButton } from '@/components/ui/button';
import { Card, Chip, ChipRow, EmptyState, Segmented } from '@/components/ui/primitives';
import { Content, Screen, ScreenHeader } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { listTables } from '@/db/menu';
import {
  cancelOrder,
  deleteOrderLine,
  listActiveOrders,
  listActiveOrdersWithLines,
  listOrders,
} from '@/db/orders';
import type { DiningTable, OrderDetail, OrderLine, OrderStatus, OrderWithTable } from '@/db/pos-types';
import { closeShift, countUnsettled, getOpenShift } from '@/db/shifts';
import { useOrderActions } from '@/hooks/use-order-actions';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/i18n';
import { confirm, notify } from '@/lib/confirm';
import { formatTime, minutesSince, receiptDate, today } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { orderLabel } from '@/lib/order-label';
import { useDb, useDbQuery, useRevalidateAll, useSettings } from '@/providers/database';
import { radius, useTheme } from '@/theme';

type ViewMode = 'running' | 'tables' | 'takeaway' | 'history';

export default function OrdersScreen() {
  const db = useDb();
  const settings = useSettings();
  const revalidateAll = useRevalidateAll();
  const { t, locale, itemName } = useI18n();
  const { colors } = useTheme();
  const { gutter, gridColumns } = useResponsive();
  const actions = useOrderActions();

  const [mode, setMode] = useState<ViewMode>('running');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  const { data: openShift } = useDbQuery('open-shift', getOpenShift);
  const { data: runningOrders = [] } = useDbQuery('active-orders-lines', listActiveOrdersWithLines);
  const { data: activeOrders = [] } = useDbQuery('active-orders', listActiveOrders);
  const { data: tables = [] } = useDbQuery('tables', listTables);

  const businessDate = openShift?.business_date ?? today();
  const { data: dayOrders = [] } = useDbQuery(['day-orders', businessDate], (d) =>
    listOrders(d, { from: businessDate, to: businessDate }),
  );

  const handleCloseShift = async () => {
    if (!openShift) return;
    const unsettled = await countUnsettled(db, openShift.id);
    if (unsettled > 0) {
      notify(t('shift.close'), t('shift.unsettled', { count: unsettled }));
      return;
    }
    const ok = await confirm({
      title: t('shift.closeTitle', { name: openShift.name }),
      message: t('shift.closeBody'),
      confirmLabel: t('shift.close'),
      cancelLabel: t('form.cancel'),
    });
    if (!ok) return;
    await closeShift(db, openShift.id);
    await revalidateAll();
  };

  const header = (
    <ScreenHeader
      eyebrow={
        openShift
          ? `${openShift.name} · ${receiptDate(openShift.business_date)}`
          : t('shift.none')
      }
      title={t('tab.orders')}
      right={
        openShift ? (
          <Button
            label={t('shift.close')}
            icon="lock-closed-outline"
            variant="soft"
            onPress={handleCloseShift}
          />
        ) : null
      }
    />
  );

  const segmentedTabs = (
    <View style={{ paddingHorizontal: gutter, paddingBottom: 12 }}>
      <Content>
        <Segmented<ViewMode>
          label={t('tab.orders')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'running', label: t('ord.running') },
            { value: 'tables', label: t('ord.tables') },
            { value: 'takeaway', label: t('ord.takeaway') },
            { value: 'history', label: t('ord.history') },
          ]}
        />
      </Content>
    </View>
  );

  // 1. Running Orders View (Unpaid table orders & takeaway tokens)
  const runningContent = () => {
    const handleDeleteItem = async (orderId: string, line: OrderLine) => {
      const ok = await confirm({
        title: t('ord.deleteItemTitle'),
        message: t('ord.deleteItemBody', { name: itemName(line.item_id, line.name) || line.name }),
        confirmLabel: t('ord.deleteItem'),
        cancelLabel: t('form.cancel'),
        destructive: true,
      });
      if (!ok || !line.id) return;
      await deleteOrderLine(db, orderId, line.id);
      await revalidateAll();
    };

    const handleCancelOrder = async (orderId: string) => {
      const ok = await confirm({
        title: t('ord.cancelTitle'),
        message: t('ord.cancelBody'),
        confirmLabel: t('ord.cancel'),
        cancelLabel: t('form.cancel'),
        destructive: true,
      });
      if (!ok) return;
      await cancelOrder(db, orderId);
      await revalidateAll();
    };

    if (runningOrders.length === 0) {
      return (
        <View style={{ paddingHorizontal: gutter, paddingBottom: 64 }}>
          <Content>
            <EmptyState
              icon="receipt-outline"
              title={t('ord.noActive')}
              body="All orders are paid or settled. You can start a new order anytime.">
              <Button
                label={t('pos.cart')}
                icon="cart-outline"
                variant="primary"
                onPress={() => router.navigate('/')}
              />
            </EmptyState>
          </Content>
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: gutter, paddingBottom: 64, flex: 1 }}>
        <FlashList
          data={runningOrders}
          keyExtractor={(o) => o.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item: o }) => {
            const mins = minutesSince(o.created_at);
            const isBilled = o.status === 'billed';
            const isDineIn = o.type === 'dine_in';

            return (
              <Content style={{ paddingVertical: 6 }}>
                <Card style={[styles.runningCard, isBilled ? { borderColor: colors.accent, borderWidth: 1.5 } : null]}>
                  {/* Order Top Bar */}
                  <View style={styles.runningTop}>
                    <View
                      style={[
                        styles.runningIconWrap,
                        { backgroundColor: isBilled ? colors.accentSoft : colors.primarySoft },
                      ]}>
                      <Ionicons
                        name={isDineIn ? 'restaurant' : 'bag-handle'}
                        size={20}
                        color={isBilled ? colors.accent : colors.primary}
                      />
                    </View>
                    <View style={styles.flex}>
                      <View style={styles.partyRow}>
                        <Text variant="heading">{orderLabel(o, t)}</Text>
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: isBilled ? colors.accentSoft : colors.primarySoft,
                            },
                          ]}>
                          <Text
                            variant="caption"
                            style={{
                              color: isBilled ? colors.accent : colors.primary,
                              fontWeight: '700',
                            }}>
                            {t(`ord.${o.status}`)}
                          </Text>
                        </View>
                      </View>
                      <Text variant="caption" tone="muted">
                        {t('ord.minutes', { count: mins })}
                        {o.customer_name ? ` · ${o.customer_name}` : ''}
                      </Text>
                    </View>
                    <Text variant="heading" numeric style={{ color: colors.primary }}>
                      {formatMoney(o.total, settings.currency)}
                    </Text>
                  </View>

                  {/* Order Items List */}
                  <View
                    style={[
                      styles.runningItemsList,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}>
                    {o.lines.map((line, idx) => (
                      <View
                        key={line.id ?? idx}
                        style={[
                          styles.runningLineRow,
                          idx < o.lines.length - 1
                            ? { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }
                            : null,
                        ]}>
                        <View
                          style={[
                            styles.qtyPill,
                            { backgroundColor: colors.surfaceMuted },
                          ]}>
                          <Text variant="caption" style={{ fontWeight: '700', color: colors.primary }}>
                            {line.qty}x
                          </Text>
                        </View>
                        <View style={styles.flex}>
                          <Text variant="bodyStrong">{itemName(line.item_id, line.name)}</Text>
                          {line.note ? (
                            <Text variant="caption" tone="muted">
                              {line.note}
                            </Text>
                          ) : null}
                        </View>
                        <Text variant="body" numeric tone="muted" style={{ marginRight: 8 }}>
                          {formatMoney(line.price * line.qty, settings.currency)}
                        </Text>
                        <IconButton
                          icon="trash-outline"
                          variant="ghost"
                          label={t('ord.deleteItem')}
                          onPress={() => handleDeleteItem(o.id, line)}
                        />
                      </View>
                    ))}
                  </View>

                  {/* Actions Footer */}
                  <View style={styles.runningActions}>
                    <Button
                      label={t('ord.edit')}
                      icon="create-outline"
                      variant="soft"
                      onPress={() => actions.edit(o)}
                    />
                    <Button
                      label={isBilled ? t('ord.settle') : t('ord.bill')}
                      icon="receipt-outline"
                      variant="primary"
                      onPress={() => router.push(`/order/${o.id}`)}
                    />
                    <IconButton
                      icon="close-outline"
                      variant="ghost"
                      label={t('ord.cancel')}
                      onPress={() => handleCancelOrder(o.id)}
                    />
                  </View>
                </Card>
              </Content>
            );
          }}
        />
      </View>
    );
  };

  // 2. Tables View
  const tablesContent = () => {
    const activeDineIn = activeOrders.filter((o) => o.type === 'dine_in');
    const ordersByTable = new Map<string, OrderWithTable[]>();
    for (const o of activeDineIn) {
      if (!o.table_id) continue;
      const list = ordersByTable.get(o.table_id) ?? [];
      list.push(o);
      ordersByTable.set(o.table_id, list);
    }

    return (
      <View style={{ paddingHorizontal: gutter, paddingBottom: 64 }}>
        <Content>
          {tables.length === 0 ? (
            <EmptyState
              icon="restaurant-outline"
              title="No Dining Tables Found"
              body="Configure tables with seating layout and sub-tables to start taking dine-in orders.">
              <Button
                label="Configure Tables"
                icon="grid-outline"
                variant="primary"
                onPress={() => router.push('/menu')}
              />
            </EmptyState>
          ) : (
            <View style={styles.grid}>
              {tables.map((table: DiningTable) => {
                const orders = ordersByTable.get(table.id) ?? [];
                const isOccupied = orders.length > 0;
                return (
                  <View
                    key={table.id}
                    style={{ width: `${100 / Math.min(gridColumns, 3)}%`, padding: 4 }}>
                    <Card
                      style={[
                        styles.tableCard,
                        isOccupied ? { borderColor: colors.primary, borderWidth: 1.5 } : null,
                      ]}>
                      <View style={styles.tableHeader}>
                        <View style={styles.flex}>
                          <TableChairLayout
                            name={table.name}
                            seats={table.seats}
                            isSubTable={Boolean(table.parent_id)}
                            parentName={table.parent_name}
                            status={
                              orders.some((o) => o.status === 'billed')
                                ? 'billed'
                                : isOccupied
                                  ? 'open'
                                  : 'vacant'
                            }
                            size="md"
                          />
                        </View>
                        <IconButton
                          icon="add"
                          label={isOccupied ? t('ord.shareTable') : t('pos.dineIn')}
                          variant={isOccupied ? 'soft' : 'ghost'}
                          onPress={() => actions.startAt(table.id)}
                        />
                      </View>

                      {isOccupied ? (
                        <View style={styles.ordersList}>
                          {orders.map((o) => {
                            const mins = minutesSince(o.created_at);
                            const isBilled = o.status === 'billed';
                            return (
                              <Pressable
                                key={o.id}
                                accessibilityRole="button"
                                onPress={() => router.push(`/order/${o.id}`)}
                                style={({ pressed }) => [
                                  styles.orderItem,
                                  {
                                    backgroundColor: pressed ? colors.surfaceMuted : colors.background,
                                    borderColor: isBilled ? colors.accent : colors.border,
                                  },
                                ]}>
                                <View style={styles.flex}>
                                  <View style={styles.partyRow}>
                                    <Text variant="bodyStrong">
                                      {t('pos.tableParty', { name: table.name, party: o.party ?? 'A' })}
                                    </Text>
                                    <View
                                      style={[
                                        styles.miniBadge,
                                        {
                                          backgroundColor: isBilled
                                            ? colors.accentSoft
                                            : colors.primarySoft,
                                        },
                                      ]}>
                                      <Text
                                        variant="caption"
                                        style={{
                                          color: isBilled ? colors.accent : colors.primary,
                                          fontSize: 11,
                                          fontWeight: '700',
                                        }}>
                                        {t(`ord.${o.status}`)}
                                      </Text>
                                    </View>
                                  </View>
                                  <Text variant="caption" tone="muted">
                                    {t('pos.items', { count: o.item_count })} · {t('ord.minutes', { count: mins })}
                                  </Text>
                                </View>
                                <Text variant="bodyStrong" numeric>
                                  {formatMoney(o.total, settings.currency)}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      ) : (
                        <View style={styles.freeWrap}>
                          <Text variant="caption" tone="muted">
                            {t('pos.free')}
                          </Text>
                        </View>
                      )}
                    </Card>
                  </View>
                );
              })}
            </View>
          )}
        </Content>
      </View>
    );
  };

  // 3. Takeaway View
  const takeawayContent = () => {
    const activeTakeaway = activeOrders.filter((o) => o.type === 'takeaway');
    return (
      <View style={{ paddingHorizontal: gutter, paddingBottom: 64 }}>
        <Content style={styles.takeawayWrap}>
          <Button
            label={t('pos.newToken')}
            icon="add"
            variant="primary"
            size="lg"
            onPress={() => actions.startAt(null)}
            fullWidth
          />

          {activeTakeaway.length === 0 ? (
            <EmptyState icon="bag-handle-outline" title={t('ord.noTokens')} />
          ) : (
            <View style={styles.grid}>
              {activeTakeaway.map((o) => {
                const mins = minutesSince(o.created_at);
                const isBilled = o.status === 'billed';
                return (
                  <View
                    key={o.id}
                    style={{ width: `${100 / Math.min(gridColumns, 2)}%`, padding: 4 }}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push(`/order/${o.id}`)}
                      style={({ pressed }) => [
                        styles.takeawayCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: isBilled ? colors.accent : colors.border,
                          opacity: pressed ? 0.9 : 1,
                        },
                      ]}>
                      <View style={styles.takeawayTop}>
                        <View style={styles.flex}>
                          <Text variant="heading">{orderLabel(o, t)}</Text>
                          {o.customer_name ? (
                            <Text variant="caption" tone="muted">
                              {o.customer_name}
                            </Text>
                          ) : null}
                        </View>
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: isBilled ? colors.accentSoft : colors.primarySoft,
                            },
                          ]}>
                          <Text
                            variant="caption"
                            style={{
                              color: isBilled ? colors.accent : colors.primary,
                              fontWeight: '700',
                            }}>
                            {t(`ord.${o.status}`)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.takeawayBottom}>
                        <Text variant="caption" tone="muted">
                          {t('pos.items', { count: o.item_count })} · {t('ord.minutes', { count: mins })}
                        </Text>
                        <Text variant="heading" numeric>
                          {formatMoney(o.total, settings.currency)}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </Content>
      </View>
    );
  };

  // 4. All Orders History
  const historyContent = () => {
    const q = query.trim().toLowerCase();
    const filtered = dayOrders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      const labelStr = orderLabel(o, t).toLowerCase();
      const billNoStr = o.bill_no ? String(o.bill_no) : '';
      const tokenStr = o.token ? String(o.token) : '';
      const customerStr = (o.customer_name ?? '').toLowerCase();
      return (
        labelStr.includes(q) ||
        billNoStr.includes(q) ||
        tokenStr.includes(q) ||
        customerStr.includes(q)
      );
    });

    return (
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: gutter, paddingBottom: 10 }}>
          <Content style={{ gap: 8 }}>
            <TextField
              icon="search"
              placeholder={t('ord.search')}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            <ChipRow>
              <Chip
                label={t('att.all')}
                selected={statusFilter === 'all'}
                onPress={() => setStatusFilter('all')}
              />
              {(['open', 'billed', 'paid', 'cancelled'] as OrderStatus[]).map((st) => (
                <Chip
                  key={st}
                  label={t(`ord.${st}`)}
                  selected={statusFilter === st}
                  onPress={() => setStatusFilter(st)}
                />
              ))}
            </ChipRow>
          </Content>
        </View>

        <FlashList
          data={filtered}
          keyExtractor={(o) => o.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 64 }}
          ListEmptyComponent={<EmptyState icon="receipt-outline" title={t('ord.noOrders')} />}
          renderItem={({ item: o }) => (
            <Content style={{ paddingVertical: 4 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/order/${o.id}`)}
                style={({ pressed }) => [
                  styles.historyRow,
                  {
                    backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
                    borderColor: colors.border,
                  },
                ]}>
                <View style={styles.flex}>
                  <View style={styles.partyRow}>
                    <Text variant="bodyStrong">{orderLabel(o, t)}</Text>
                    {o.bill_no ? (
                      <Text variant="caption" tone="muted">
                        · {t('ord.billNo', { no: o.bill_no })}
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="caption" tone="muted">
                    {formatTime(o.created_at, locale)} · {t('pos.items', { count: o.item_count })}
                    {o.customer_name ? ` · ${o.customer_name}` : ''}
                  </Text>
                </View>

                <View style={styles.historyRight}>
                  <Text variant="bodyStrong" numeric>
                    {formatMoney(o.total, settings.currency)}
                  </Text>
                  <Text
                    variant="caption"
                    style={{
                      color:
                        o.status === 'paid'
                          ? colors.primary
                          : o.status === 'billed'
                            ? colors.accent
                            : o.status === 'cancelled'
                              ? colors.danger
                              : colors.textMuted,
                      fontWeight: '700',
                    }}>
                    {t(`ord.${o.status}`)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            </Content>
          )}
        />
      </View>
    );
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      {header}
      {segmentedTabs}
      {mode === 'running'
        ? runningContent()
        : mode === 'tables'
          ? tablesContent()
          : mode === 'takeaway'
            ? takeawayContent()
            : historyContent()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  tableCard: { padding: 12, borderRadius: radius.lg, minHeight: 120, gap: 8 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  freeWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  ordersList: { gap: 6 },
  orderItem: {
    padding: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniBadge: { borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2 },
  takeawayWrap: { gap: 14 },
  takeawayCard: { padding: 14, borderRadius: radius.lg, borderWidth: 1, gap: 10 },
  takeawayTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  takeawayBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 64,
  },
  historyRight: { alignItems: 'flex-end', gap: 2 },
  runningCard: { padding: 14, borderRadius: radius.lg, gap: 12 },
  runningTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  runningIconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  runningItemsList: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  runningLineRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, gap: 10 },
  qtyPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  runningActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
});
