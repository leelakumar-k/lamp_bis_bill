import { StyleSheet, View } from 'react-native';

import { type AttendanceRow, Status } from '@/db/types';
import { dayFactor } from '@/db/attendance';
import { useI18n } from '@/i18n';
import { formatMoney } from '@/lib/money';
import { useSettings } from '@/providers/database';
import { radius, useTheme } from '@/theme';

import { Card } from '../ui/primitives';
import { Text } from '../ui/text';
import { STATUSES } from './status';

export function summarize(rows: AttendanceRow[]) {
  const counts: Record<Status, number> = {
    [Status.Present]: 0,
    [Status.HalfDay]: 0,
    [Status.Leave]: 0,
    [Status.Absent]: 0,
  };
  let wages = 0;
  for (const row of rows) {
    if (row.status === null) continue;
    counts[row.status]++;
    wages += dayFactor(row.status) * (row.wage_snapshot ?? row.daily_wage);
  }
  const marked = rows.length - rows.filter((r) => r.status === null).length;
  return { counts, wages: Math.round(wages), marked, total: rows.length };
}

/** The day's register: a proportional bar of statuses with counts and the wage total. */
export function DaySummary({ rows }: { rows: AttendanceRow[] }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { currency } = useSettings();
  const { counts, wages, marked, total } = summarize(rows);
  const unmarked = total - marked;

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.flex}>
          <Text variant="caption" tone="muted">
            {t('att.wagesToday')}
          </Text>
          <Text variant="display" numeric>
            {formatMoney(wages, currency)}
          </Text>
        </View>
        <Text variant="label" tone="muted" numeric style={styles.markedText}>
          {t('att.marked', { done: marked, total })}
        </Text>
      </View>

      <View
        style={[styles.bar, { backgroundColor: colors.surfaceMuted }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        {STATUSES.map((meta) =>
          counts[meta.status] > 0 ? (
            <View
              key={meta.status}
              style={{ flex: counts[meta.status], backgroundColor: meta.color(colors).fg }}
            />
          ) : null,
        )}
        {unmarked > 0 ? <View style={{ flex: unmarked }} /> : null}
      </View>

      <View style={styles.legend}>
        {STATUSES.map((meta) => (
          <View
            key={meta.status}
            style={styles.legendItem}
            accessible
            accessibilityLabel={`${t(meta.label)}: ${counts[meta.status]}`}>
            <View style={[styles.dot, { backgroundColor: meta.color(colors).fg }]} />
            <Text variant="caption" tone="muted" numberOfLines={1} style={styles.flexShrink}>
              {t(meta.label)}
            </Text>
            <Text variant="bodyStrong" numeric>
              {counts[meta.status]}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 14 },
  topRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  flexShrink: { flexShrink: 1 },
  markedText: { paddingBottom: 6 },
  bar: { height: 10, borderRadius: radius.pill, flexDirection: 'row', overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, columnGap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: '40%', flexGrow: 1, flexBasis: 0 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
