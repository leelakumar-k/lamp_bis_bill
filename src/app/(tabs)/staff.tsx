import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactElement, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AttendanceRow } from '@/components/attendance/attendance-row';
import { DaySummary } from '@/components/attendance/day-summary';
import { statusMeta } from '@/components/attendance/status';
import { PeriodStepper } from '@/components/period-stepper';
import { Button, IconButton } from '@/components/ui/button';
import { Chip, ChipRow, EmptyState } from '@/components/ui/primitives';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/toast';
import { clearStatuses, copyFromDate, getAttendanceForDate, markRemaining, setStatus } from '@/db/attendance';
import { loadSampleData } from '@/db/seed';
import { type AttendanceRow as Row, Status } from '@/db/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/i18n';
import { addDays, formatDay, formatWeekday, isISODate, relativeDay, today } from '@/lib/date';
import { selectionFeedback, successFeedback } from '@/lib/haptics';
import { useDb, useDbQuery, useRevalidateAll, useSettings } from '@/providers/database';

export default function AttendanceScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const date = isISODate(params.date) ? params.date : today();
  const db = useDb();
  const revalidateAll = useRevalidateAll();
  const toast = useToast();
  const { t, locale, workerName, profession } = useI18n();
  const { businessName } = useSettings();
  const { isWide, width, gutter } = useResponsive();
  const [query, setQuery] = useState('');
  const [professionFilter, setProfessionFilter] = useState<string | null>(null);

  const { data: rows = [], mutate, isLoading } = useDbQuery(['attendance', date], (d) =>
    getAttendanceForDate(d, date),
  );

  const professions = useMemo(() => [...new Set(rows.map((r) => r.profession))].sort(), [rows]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (professionFilter && r.profession !== professionFilter) return false;
      if (!q) return true;
      return [r.first_name, r.last_name ?? '', workerName(r.worker_id, r), profession(r.profession)]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [rows, query, professionFilter, workerName, profession]);

  const headerActions = (
    <>
      <IconButton icon="people-outline" label={t('tab.workers')} variant="soft" onPress={() => router.push('/workers')} />
      <IconButton
        icon="wallet-outline"
        label={t('sales.staff')}
        variant="soft"
        onPress={() => router.push('/staff-report')}
      />
    </>
  );

  const setDate = (next: string) => router.setParams({ date: next });
  const relative = relativeDay(date);
  const dayTitle = relative ? t(`day.${relative}`) : formatWeekday(date, locale);
  const unmarkedCount = rows.filter((r) => r.status === null).length;

  const changeStatus = async (row: Row, status: Status) => {
    if (row.status === status) return;
    selectionFeedback();
    const previous = row.status;
    await mutate(
      (current) =>
        current?.map((r) =>
          r.worker_id === row.worker_id ? { ...r, status, wage_snapshot: r.wage_snapshot ?? r.daily_wage } : r,
        ),
      { revalidate: false },
    );
    await setStatus(db, row.worker_id, date, status);
    revalidateAll();
    toast({
      message: t('att.markedToast', { name: workerName(row.worker_id, row), status: t(statusMeta(status).label) }),
      actionLabel: t('att.undo'),
      onAction: async () => {
        await setStatus(db, row.worker_id, date, previous);
        revalidateAll();
      },
    });
  };

  const markRest = async () => {
    const ids = await markRemaining(db, date, Status.Present);
    successFeedback();
    revalidateAll();
    toast({
      message: t('att.bulkToast', { count: ids.length }),
      actionLabel: t('att.undo'),
      onAction: async () => {
        await clearStatuses(db, date, ids);
        revalidateAll();
      },
    });
  };

  const copyYesterday = async () => {
    const ids = await copyFromDate(db, addDays(date, -1), date);
    if (ids.length === 0) {
      toast({ message: t('att.nothingToCopy') });
      return;
    }
    successFeedback();
    revalidateAll();
    toast({
      message: t('att.copiedToast', { count: ids.length }),
      actionLabel: t('att.undo'),
      onAction: async () => {
        await clearStatuses(db, date, ids);
        revalidateAll();
      },
    });
  };

  const controls = (
    <View style={styles.stack}>
      <PeriodStepper
        title={dayTitle}
        subtitle={formatDay(date, locale)}
        previousLabel={t('day.previous')}
        nextLabel={t('day.next')}
        onPrevious={() => setDate(addDays(date, -1))}
        onNext={() => setDate(addDays(date, 1))}
        nextDisabled={date >= today()}
        onReset={relative === 'today' ? undefined : () => setDate(today())}
        resetHint={t('day.today')}
      />
      <DaySummary rows={rows} />
      <View style={styles.actions}>
        <Button
          label={unmarkedCount === 0 ? t('att.allMarked') : t('att.markRest')}
          icon="checkmark-done"
          variant="primary"
          disabled={unmarkedCount === 0}
          onPress={markRest}
          style={styles.action}
        />
        <Button
          label={t('att.copyYesterday')}
          icon="copy-outline"
          variant="secondary"
          disabled={unmarkedCount === 0}
          onPress={copyYesterday}
          style={styles.action}
        />
      </View>
    </View>
  );

  const filters = (
    <View style={styles.filters}>
      <TextField
        icon="search"
        placeholder={t('att.search')}
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        clearButtonMode="while-editing"
        autoCorrect={false}
      />
      {professions.length > 1 ? (
        <ChipRow>
          <Chip label={t('att.all')} selected={professionFilter === null} onPress={() => setProfessionFilter(null)} />
          {professions.map((p) => (
            <Chip
              key={p}
              label={profession(p)}
              selected={professionFilter === p}
              onPress={() => setProfessionFilter(professionFilter === p ? null : p)}
            />
          ))}
        </ChipRow>
      ) : null}
    </View>
  );

  const empty =
    rows.length === 0 && !isLoading ? (
      <EmptyState icon="people-outline" title={t('att.emptyTitle')} body={t('att.emptyBody')}>
        <Button label={t('workers.add')} icon="person-add-outline" onPress={() => router.push('/worker/new')} />
        <Button
          label={t('set.sample')}
          variant="ghost"
          onPress={async () => {
            await loadSampleData(db);
            revalidateAll();
          }}
        />
      </EmptyState>
    ) : (
      <EmptyState icon="search" title={t('att.noResults')} />
    );

  const list = (header?: ReactElement) => (
    <FlashList
      data={visible}
      keyExtractor={(r) => r.worker_id}
      extraData={visible}
      renderItem={({ item }) => <AttendanceRow row={item} compact={width < 420} onChange={changeStatus} />}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 96 }}
    />
  );

  const eyebrow = businessName || 'Muster';

  if (isWide) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow={eyebrow} title={t('tab.attendance')} right={headerActions} />
        <View style={styles.split}>
          <ScrollView style={styles.sidePane} contentContainerStyle={{ paddingLeft: gutter, paddingBottom: gutter }}>
            {controls}
          </ScrollView>
          <View style={styles.mainPane}>
            <View style={{ paddingHorizontal: gutter, paddingBottom: 12 }}>{filters}</View>
            {list()}
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScreenHeader eyebrow={eyebrow} title={t('tab.attendance')} right={headerActions} />
      {list(
        <View style={styles.header}>
          {controls}
          {rows.length > 0 ? filters : null}
        </View>,
      )}
    </Screen>
  );
}

function Separator() {
  return <View style={{ height: 8 }} />;
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  header: { gap: 16, paddingBottom: 12 },
  filters: { gap: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flexGrow: 1, flexBasis: 150 },
  split: { flex: 1, flexDirection: 'row' },
  sidePane: { width: 400, flexGrow: 0 },
  mainPane: { flex: 1 },
});
