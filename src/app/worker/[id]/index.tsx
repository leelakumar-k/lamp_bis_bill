import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { MonthCalendar } from '@/components/month-calendar';
import { PeriodStepper } from '@/components/period-stepper';
import { Button, IconButton } from '@/components/ui/button';
import { Avatar, Card, EmptyState, ListRow, SectionTitle } from '@/components/ui/primitives';
import { Content, Screen, ScreenHeader } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { dayFactor, getWorkerMonth } from '@/db/attendance';
import { deletePayment, listPayments } from '@/db/payments';
import { workerBalance } from '@/db/reports';
import type { Payment, Status } from '@/db/types';
import { getWorker } from '@/db/workers';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/i18n';
import { addMonths, currentMonth, formatMonth, formatShortDate, monthRange } from '@/lib/date';
import { confirm } from '@/lib/confirm';
import { formatMoney } from '@/lib/money';
import { useDb, useDbQuery, useRevalidateAll, useSettings } from '@/providers/database';
import { useTheme } from '@/theme';

export default function WorkerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const revalidateAll = useRevalidateAll();
  const { t, locale, workerName, profession } = useI18n();
  const { currency } = useSettings();
  const { colors } = useTheme();
  const { isWide, gutter } = useResponsive();
  const [month, setMonth] = useState(currentMonth());
  const { start, end } = monthRange(month);

  const { data: worker, isLoading } = useDbQuery(['worker', id], (d) => getWorker(d, id));
  const { data: days = [] } = useDbQuery(['worker-month', id, month], (d) => getWorkerMonth(d, id, start, end));
  const { data: balance } = useDbQuery(['balance', id], (d) => workerBalance(d, id));
  const { data: payments = [] } = useDbQuery(['payments', id], (d) => listPayments(d, id));

  if (!worker) {
    return (
      <Screen>
        <ScreenHeader back title="" />
        {isLoading ? null : <EmptyState icon="person-outline" title={t('detail.notFound')} />}
      </Screen>
    );
  }

  const name = workerName(worker.id, worker);
  const statuses = Object.fromEntries(days.map((d) => [d.date, d.status])) as Record<string, Status>;
  const daysWorked = days.reduce((sum, d) => sum + dayFactor(d.status), 0);
  const monthEarned = Math.round(days.reduce((sum, d) => sum + dayFactor(d.status) * d.wage_snapshot, 0));

  const removePayment = async (payment: Payment) => {
    const ok = await confirm({
      title: t('detail.deletePaymentTitle'),
      message: `${formatMoney(payment.amount, currency)} · ${formatShortDate(payment.paid_on, locale)}`,
      confirmLabel: t('form.delete'),
      cancelLabel: t('form.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await deletePayment(db, payment.id);
    revalidateAll();
  };

  const profile = (
    <View style={styles.profile}>
      <Avatar name={`${worker.first_name} ${worker.last_name ?? ''}`} size={64} />
      <View style={styles.flex}>
        <Text variant="title" numberOfLines={2}>
          {name}
        </Text>
        <Text tone="muted" numberOfLines={1}>
          {profession(worker.profession)} · {t('workers.perDay', { amount: formatMoney(worker.daily_wage, currency) })}
        </Text>
        {worker.address ? (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text variant="caption" tone="muted" numberOfLines={2} style={styles.flex}>
              {worker.address}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  const balanceCard = (
    <Card style={styles.balance}>
      <View style={styles.flex}>
        <Text variant="caption" tone="muted">
          {t('detail.balance')} · {t('detail.allTime')}
        </Text>
        <Text variant="display" numeric tone={balance && balance.balance < 0 ? 'danger' : 'default'}>
          {formatMoney(balance?.balance ?? 0, currency)}
        </Text>
      </View>
      <View style={styles.balanceSplit}>
        <Stat label={t('detail.earned')} value={formatMoney(balance?.earned ?? 0, currency)} />
        <Stat label={t('detail.paid')} value={formatMoney(balance?.paid ?? 0, currency)} />
      </View>
    </Card>
  );

  const calendar = (
    <Card style={styles.section}>
      <PeriodStepper
        compact
        title={formatMonth(month, locale)}
        previousLabel={t('rep.previousMonth')}
        nextLabel={t('rep.nextMonth')}
        onPrevious={() => setMonth(addMonths(month, -1))}
        onNext={() => setMonth(addMonths(month, 1))}
        nextDisabled={month >= currentMonth()}
      />
      <View style={styles.monthStats}>
        <Stat label={t('detail.daysWorked')} value={String(daysWorked)} />
        <Stat label={t('detail.earned')} value={formatMoney(monthEarned, currency)} />
      </View>
      <MonthCalendar month={month} statuses={statuses} onDayPress={(date) => router.push({ pathname: '/staff', params: { date } })} />
    </Card>
  );

  const paymentsSection = (
    <View>
      <View style={styles.sectionHeader}>
        <SectionTitle>{t('detail.payments')}</SectionTitle>
        <Button
          label={t('detail.addPayment')}
          icon="add"
          variant="soft"
          onPress={() => router.push(`/worker/${worker.id}/payment`)}
        />
      </View>
      <Card>
        {payments.length === 0 ? (
          <Text tone="muted" style={styles.emptyPayments}>
            {t('detail.noPayments')}
          </Text>
        ) : (
          payments.map((p, i) => (
            <ListRow
              key={p.id}
              icon={p.type === 'advance' ? 'arrow-up-circle-outline' : 'checkmark-circle-outline'}
              title={formatMoney(p.amount, currency)}
              subtitle={[
                t(p.type === 'advance' ? 'pay.advance' : 'pay.settlement'),
                formatShortDate(p.paid_on, locale),
                p.note,
              ]
                .filter(Boolean)
                .join(' · ')}
              last={i === payments.length - 1}
              right={<IconButton icon="trash-outline" label={t('form.delete')} onPress={() => removePayment(p)} />}
            />
          ))
        )}
      </Card>
    </View>
  );

  return (
    <Screen>
      <ScreenHeader
        back
        title={t('tab.workers')}
        right={
          <>
            {worker.mobile ? (
              <IconButton
                icon="call-outline"
                label={t('detail.call')}
                variant="soft"
                onPress={() => Linking.openURL(`tel:${worker.mobile}`)}
              />
            ) : null}
            <IconButton
              icon="create-outline"
              label={t('detail.edit')}
              variant="soft"
              onPress={() => router.push(`/worker/${worker.id}/edit`)}
            />
          </>
        }
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 40 }}>
        <Content style={styles.body}>
          {profile}
          {isWide ? (
            <View style={styles.columns}>
              <View style={styles.column}>{calendar}</View>
              <View style={styles.column}>
                {balanceCard}
                {paymentsSection}
              </View>
            </View>
          ) : (
            <>
              {balanceCard}
              {calendar}
              {paymentsSection}
            </>
          )}
        </Content>
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="heading" numeric numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16 },
  flex: { flex: 1, minWidth: 0 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  balance: { padding: 16, gap: 12 },
  balanceSplit: { flexDirection: 'row', gap: 16 },
  section: { padding: 12, gap: 12 },
  monthStats: { flexDirection: 'row', gap: 16, paddingHorizontal: 4 },
  stat: { flex: 1, minWidth: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  emptyPayments: { padding: 16 },
  columns: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  column: { flex: 1, gap: 16 },
});
