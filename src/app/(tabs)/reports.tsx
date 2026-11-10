import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/ui/button';
import { Card, Chip, ChipRow, EmptyState, SectionTitle, Segmented } from '@/components/ui/primitives';
import { Content, Screen, ScreenHeader } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { numberSetting } from '@/db/meta';
import {
  salesByCategory,
  salesByHour,
  salesByPayment,
  salesByShift,
  salesSummary,
  type ShiftTotal,
  type Slice,
  topItems,
} from '@/db/sales';
import { listShifts } from '@/db/shifts';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/i18n';
import { toCsv } from '@/lib/csv';
import { addDays, currentMonth, formatShortDate, monthRange, receiptDate, today } from '@/lib/date';
import { shareFile } from '@/lib/file-io';
import { formatMoney } from '@/lib/money';
import { printReceipt } from '@/lib/print';
import { buildShiftReport } from '@/lib/receipt';
import { useDb, useDbQuery, useSettings } from '@/providers/database';
import { usePrinter } from '@/providers/printer-context';
import { radius, useTheme } from '@/theme';

type QuickRange = 'today' | 'yesterday' | 'last7' | 'thisMonth';

export default function SalesReportScreen() {
  const db = useDb();
  const settings = useSettings();
  const { t, locale, itemName, categoryName } = useI18n();
  const { colors } = useTheme();
  const { gutter, gridColumns, isWide } = useResponsive();
  const { printBill } = usePrinter();

  const [rangePreset, setRangePreset] = useState<QuickRange>('today');
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  const { from, to } = useMemo(() => {
    const now = today();
    switch (rangePreset) {
      case 'today':
        return { from: now, to: now };
      case 'yesterday': {
        const yest = addDays(now, -1);
        return { from: yest, to: yest };
      }
      case 'last7':
        return { from: addDays(now, -6), to: now };
      case 'thisMonth': {
        const { start, end } = monthRange(currentMonth());
        return { from: start, to: end };
      }
    }
  }, [rangePreset]);

  const salesRange = useMemo(
    () => ({ from, to, shiftId: selectedShiftId }),
    [from, to, selectedShiftId],
  );

  const { data: shifts = [] } = useDbQuery(['shifts', from, to], (d) => listShifts(d, from, to));
  const { data: summary } = useDbQuery(['sales-summary', salesRange], (d) => salesSummary(d, salesRange));
  const { data: categories = [] } = useDbQuery(['sales-cat', salesRange], (d) =>
    salesByCategory(d, salesRange),
  );
  const { data: topDishes = [] } = useDbQuery(['sales-top', salesRange], (d) =>
    topItems(d, salesRange, 8),
  );
  const { data: payments = [] } = useDbQuery(['sales-pay', salesRange], (d) =>
    salesByPayment(d, salesRange),
  );
  const { data: shiftsList = [] } = useDbQuery(['sales-shift', from, to], (d) => salesByShift(d, from, to));

  const dayStartHour = numberSetting(settings.dayStartHour, 6);
  const { data: hourly = [] } = useDbQuery(['sales-hour', salesRange, dayStartHour], (d) =>
    salesByHour(d, salesRange, dayStartHour),
  );

  const hasSales = (summary?.orders ?? 0) > 0;
  const avgBill = hasSales && summary ? Math.round(summary.net / summary.orders) : 0;

  const exportSalesCsv = async () => {
    const rows: (string | number)[][] = [
      ['Date Range', `${from} to ${to}`],
      ['Orders', summary?.orders ?? 0],
      ['Gross Sales', (summary?.gross ?? 0) / 100],
      ['Discount', (summary?.discount ?? 0) / 100],
      ['Tax Collected', (summary?.tax ?? 0) / 100],
      ['Net Sales', (summary?.net ?? 0) / 100],
      [],
      ['Top Dishes', 'Quantity', 'Sales'],
      ...topDishes.map((item: Slice) => [item.label, item.qty ?? 0, item.value / 100]),
      [],
      ['Categories', 'Quantity', 'Sales'],
      ...categories.map((c: Slice) => [c.label, c.qty ?? 0, c.value / 100]),
      [],
      ['Payment Mode', 'Orders', 'Amount'],
      ...payments.map((p) => [p.key.toUpperCase(), p.orders, p.value / 100]),
    ];
    await shareFile(`sales-report-${from}-to-${to}.csv`, 'text/csv', toCsv(rows));
  };

  const handlePrintShift = async (shiftTotal: ShiftTotal) => {
    const model = buildShiftReport(shiftTotal, shiftTotal, settings);
    await printBill(model);
  };

  const header = (
    <ScreenHeader
      eyebrow={settings.businessName || 'Muster'}
      title={t('sales.sales')}
      right={
        <View style={styles.headerRow}>
          <IconButton
            icon="wallet-outline"
            label={t('sales.staff')}
            variant="soft"
            onPress={() => router.push('/staff-report')}
          />
          <IconButton
            icon="share-outline"
            label={t('rep.export')}
            variant="soft"
            disabled={!hasSales}
            onPress={exportSalesCsv}
          />
        </View>
      }
    />
  );

  const rangeSelector = (
    <View style={{ paddingHorizontal: gutter, paddingBottom: 12 }}>
      <Content style={styles.rangeStack}>
        <Segmented<QuickRange>
          label={t('sales.sales')}
          value={rangePreset}
          onChange={(v) => {
            setRangePreset(v);
            setSelectedShiftId(null);
          }}
          options={[
            { value: 'today', label: t('sales.today') },
            { value: 'yesterday', label: t('sales.yesterday') },
            { value: 'last7', label: t('sales.last7') },
            { value: 'thisMonth', label: t('sales.thisMonth') },
          ]}
        />

        {shifts.length > 1 ? (
          <ChipRow>
            <Chip
              label={t('sales.allShifts')}
              selected={selectedShiftId === null}
              onPress={() => setSelectedShiftId(null)}
            />
            {shifts.map((s) => (
              <Chip
                key={s.id}
                label={`${s.name} (${receiptDate(s.business_date)})`}
                selected={selectedShiftId === s.id}
                onPress={() => setSelectedShiftId(s.id)}
              />
            ))}
          </ChipRow>
        ) : null}
      </Content>
    </View>
  );

  const kpiSection = (
    <View style={styles.kpiGrid}>
      <Card style={styles.kpiCard}>
        <Text variant="caption" tone="muted">
          {t('sales.net')}
        </Text>
        <Text variant="title" numeric style={{ color: colors.primary }}>
          {formatMoney(summary?.net ?? 0, settings.currency)}
        </Text>
        <Text variant="caption" tone="muted">
          {t('ord.subtotal')}: {formatMoney(summary?.gross ?? 0, settings.currency)}
        </Text>
      </Card>

      <Card style={styles.kpiCard}>
        <Text variant="caption" tone="muted">
          {t('sales.orders')}
        </Text>
        <Text variant="title" numeric>
          {summary?.orders ?? 0}
        </Text>
        <Text variant="caption" tone="muted">
          {t('sales.avg')}: {formatMoney(avgBill, settings.currency)}
        </Text>
      </Card>

      <Card style={styles.kpiCard}>
        <Text variant="caption" tone="muted">
          {t('sales.taxCollected')}
        </Text>
        <Text variant="title" numeric>
          {formatMoney(summary?.tax ?? 0, settings.currency)}
        </Text>
        <Text variant="caption" tone="muted">
          {t('ord.discount')}: {formatMoney(summary?.discount ?? 0, settings.currency)}
        </Text>
      </Card>
    </View>
  );

  const orderTypeCard = (
    <Card style={styles.card}>
      <SectionTitle>{t('sales.byType')}</SectionTitle>
      <View style={styles.typeRow}>
        <View style={styles.flex}>
          <Text variant="bodyStrong">{t('pos.dineIn')}</Text>
          <Text variant="heading" numeric>
            {formatMoney(summary?.dine_in ?? 0, settings.currency)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.flex}>
          <Text variant="bodyStrong">{t('pos.takeaway')}</Text>
          <Text variant="heading" numeric>
            {formatMoney(summary?.takeaway ?? 0, settings.currency)}
          </Text>
        </View>
      </View>
    </Card>
  );

  const paymentCard = (
    <Card style={styles.card}>
      <SectionTitle>{t('sales.byPayment')}</SectionTitle>
      {payments.map((p, idx) => (
        <View
          key={p.key}
          style={[
            styles.listRow,
            idx < payments.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
          ]}>
          <View style={styles.flex}>
            <Text variant="bodyStrong">
              {p.key === 'unpaid' ? t('sales.unpaid') : t(`ord.${p.key}` as any)}
            </Text>
            <Text variant="caption" tone="muted">
              {t('sales.orders')}: {p.orders}
            </Text>
          </View>
          <Text variant="bodyStrong" numeric>
            {formatMoney(p.value, settings.currency)}
          </Text>
        </View>
      ))}
    </Card>
  );

  const topDishesCard = (
    <Card style={styles.card}>
      <SectionTitle>{t('sales.topItems')}</SectionTitle>
      {topDishes.map((item: Slice, idx: number) => (
        <View
          key={item.key}
          style={[
            styles.listRow,
            idx < topDishes.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
          ]}>
          <View style={styles.flex}>
            <Text variant="bodyStrong">{itemName(item.key, item.label)}</Text>
            <Text variant="caption" tone="muted">
              {t('sales.sold', { count: item.qty ?? 0 })}
            </Text>
          </View>
          <Text variant="bodyStrong" numeric>
            {formatMoney(item.value, settings.currency)}
          </Text>
        </View>
      ))}
    </Card>
  );

  const categoriesCard = (
    <Card style={styles.card}>
      <SectionTitle>{t('sales.byCategory')}</SectionTitle>
      {categories.map((cat: Slice, idx: number) => (
        <View
          key={cat.key}
          style={[
            styles.listRow,
            idx < categories.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
          ]}>
          <View style={styles.flex}>
            <Text variant="bodyStrong">{categoryName(cat.key, cat.label)}</Text>
            <Text variant="caption" tone="muted">
              {t('sales.sold', { count: cat.qty ?? 0 })}
            </Text>
          </View>
          <Text variant="bodyStrong" numeric>
            {formatMoney(cat.value, settings.currency)}
          </Text>
        </View>
      ))}
    </Card>
  );

  const shiftsCard =
    shiftsList.length > 0 ? (
      <Card style={styles.card}>
        <SectionTitle>{t('sales.byShift')}</SectionTitle>
        {shiftsList.map((s, idx) => (
          <View
            key={s.id}
            style={[
              styles.shiftRow,
              idx < shiftsList.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
            ]}>
            <View style={styles.flex}>
              <Text variant="bodyStrong">
                {s.name} · {receiptDate(s.business_date)}
              </Text>
              <Text variant="caption" tone="muted">
                {s.orders} {t('sales.orders')} · {formatMoney(s.net, settings.currency)}
              </Text>
            </View>
            <Button
              label={t('shift.print')}
              icon="print-outline"
              variant="soft"
              size="md"
              onPress={() => handlePrintShift(s)}
            />
          </View>
        ))}
      </Card>
    ) : null;

  return (
    <Screen edges={['top', 'left', 'right']}>
      {header}
      {rangeSelector}
      <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 64 }}>
        <Content style={styles.body}>
          {kpiSection}

          {!hasSales ? (
            <EmptyState icon="pie-chart-outline" title={t('sales.empty')} />
          ) : isWide ? (
            <View style={styles.split}>
              <View style={styles.flex}>
                {orderTypeCard}
                {topDishesCard}
                {shiftsCard}
              </View>
              <View style={styles.flex}>
                {paymentCard}
                {categoriesCard}
              </View>
            </View>
          ) : (
            <>
              {orderTypeCard}
              {paymentCard}
              {topDishesCard}
              {categoriesCard}
              {shiftsCard}
            </>
          )}
        </Content>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rangeStack: { gap: 10 },
  body: { gap: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { flex: 1, minWidth: 150, padding: 14, gap: 4 },
  card: { padding: 16, gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  typeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 4 },
  divider: { width: 1, height: 40, backgroundColor: '#D9DFDA' },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, gap: 8 },
  shiftRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, gap: 8 },
  split: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
});