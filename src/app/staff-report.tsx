import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PeriodStepper } from '@/components/period-stepper';
import { Button } from '@/components/ui/button';
import { Card, EmptyState } from '@/components/ui/primitives';
import { Content, Screen, ScreenHeader } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { monthSummary } from '@/db/reports';
import type { WorkerMonthSummary } from '@/db/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/i18n';
import { toCsv } from '@/lib/csv';
import { addMonths, currentMonth, formatMonth, monthRange } from '@/lib/date';
import { shareFile } from '@/lib/file-io';
import { formatMoney } from '@/lib/money';
import { useDbQuery, useSettings } from '@/providers/database';
import { useTheme } from '@/theme';

export default function ReportsScreen() {
  const { t, locale, workerName, profession } = useI18n();
  const { currency } = useSettings();
  const { colors } = useTheme();
  const { gutter, width } = useResponsive();
  const [month, setMonth] = useState(currentMonth());
  const { start, end } = monthRange(month);
  const { data: rows = [] } = useDbQuery(['report', month], (db) => monthSummary(db, start, end));

  const active = rows.filter((r) => r.days_worked > 0 || r.paid > 0 || r.absent > 0 || r.leave > 0);
  const totals = active.reduce(
    (acc, r) => ({ earned: acc.earned + r.earned, paid: acc.paid + r.paid }),
    { earned: 0, paid: 0 },
  );
  const tableLayout = width >= 700;
  const money = (v: number) => formatMoney(v, currency);
  const nameOf = (r: WorkerMonthSummary) => workerName(r.worker_id, r);

  const exportCsv = async () => {
    const csv = toCsv([
      [t('rep.worker'), t('form.profession'), t('detail.daysWorked'), t('status.absent'), t('status.leave'), t('detail.earned'), t('detail.paid'), t('rep.due')],
      ...active.map((r) => [
        nameOf(r),
        profession(r.profession),
        r.days_worked,
        r.absent,
        r.leave,
        r.earned / 100,
        r.paid / 100,
        (r.earned - r.paid) / 100,
      ]),
    ]);
    await shareFile(`muster-${month}.csv`, 'text/csv', csv);
  };

  return (
    <Screen>
      <ScreenHeader
        back
        title={t('sales.staff')}
        right={
          <Button label={t('rep.export')} icon="share-outline" variant="secondary" onPress={exportCsv} disabled={!active.length} />
        }
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 96 }}>
        <Content style={styles.body}>
          <PeriodStepper
            title={formatMonth(month, locale)}
            previousLabel={t('rep.previousMonth')}
            nextLabel={t('rep.nextMonth')}
            onPrevious={() => setMonth(addMonths(month, -1))}
            onNext={() => setMonth(addMonths(month, 1))}
            nextDisabled={month >= currentMonth()}
            onReset={month === currentMonth() ? undefined : () => setMonth(currentMonth())}
          />

          <View style={styles.totals}>
            <Total label={t('rep.totalWages')} value={money(totals.earned)} />
            <Total label={t('rep.paidOut')} value={money(totals.paid)} />
            <Total label={t('rep.due')} value={money(totals.earned - totals.paid)} highlight />
          </View>

          {active.length === 0 ? (
            <EmptyState icon="bar-chart-outline" title={t('rep.empty')} />
          ) : (
            <Card>
              {tableLayout ? (
                <View style={[styles.tableRow, styles.tableHead, { borderBottomColor: colors.border }]}>
                  <Text variant="caption" tone="muted" style={styles.nameCol}>
                    {t('rep.worker')}
                  </Text>
                  {[t('rep.days'), t('detail.earned'), t('detail.paid'), t('rep.due')].map((h) => (
                    <Text key={h} variant="caption" tone="muted" align="right" style={styles.numCol}>
                      {h}
                    </Text>
                  ))}
                </View>
              ) : null}
              {active.map((r, i) => {
                const due = r.earned - r.paid;
                const border = i < active.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border } : null;
                return (
                  <Pressable
                    key={r.worker_id}
                    accessibilityRole="button"
                    accessibilityLabel={`${nameOf(r)}, ${t('rep.due')} ${money(due)}`}
                    onPress={() => router.push(`/worker/${r.worker_id}`)}
                    style={({ pressed }) => [styles.tableRow, border, pressed && { backgroundColor: colors.surfaceMuted }]}>
                    <View style={styles.nameCol}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        {nameOf(r)}
                      </Text>
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {tableLayout
                          ? profession(r.profession)
                          : `${r.days_worked} ${t('rep.days')} · ${t('detail.earned')} ${money(r.earned)}`}
                      </Text>
                    </View>
                    {tableLayout ? (
                      <>
                        <Text numeric align="right" style={styles.numCol}>
                          {r.days_worked}
                        </Text>
                        <Text numeric align="right" style={styles.numCol}>
                          {money(r.earned)}
                        </Text>
                        <Text numeric align="right" style={styles.numCol}>
                          {money(r.paid)}
                        </Text>
                      </>
                    ) : null}
                    <Text variant="bodyStrong" numeric align="right" tone={due < 0 ? 'danger' : 'default'} style={styles.numCol}>
                      {money(due)}
                    </Text>
                  </Pressable>
                );
              })}
            </Card>
          )}
        </Content>
      </ScrollView>
    </Screen>
  );
}

function Total({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.total,
        highlight
          ? { backgroundColor: colors.primary, borderColor: colors.primary }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}>
      <Text variant="caption" tone={highlight ? 'onPrimary' : 'muted'} numberOfLines={1}>
        {label}
      </Text>
      <Text variant="title" numeric tone={highlight ? 'onPrimary' : 'default'} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16 },
  totals: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  total: { flexGrow: 1, flexBasis: 150, borderRadius: 16, borderWidth: 1, padding: 14, gap: 2 },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 60 },
  tableHead: { minHeight: 40, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  nameCol: { flex: 2, minWidth: 0 },
  numCol: { flex: 1, minWidth: 72 },
});
