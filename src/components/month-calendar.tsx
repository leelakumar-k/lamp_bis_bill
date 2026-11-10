import { Pressable, StyleSheet, View } from 'react-native';

import type { Status } from '@/db/types';
import { useI18n } from '@/i18n';
import { formatDay, monthRange, type MonthKey, today, weekdayInitials, weekdayMondayFirst } from '@/lib/date';
import { radius, useTheme } from '@/theme';

import { statusMeta } from './attendance/status';
import { Text } from './ui/text';

type Props = {
  month: MonthKey;
  statuses: Record<string, Status>;
  onDayPress?: (date: string) => void;
};

export function MonthCalendar({ month, statuses, onDayPress }: Props) {
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const { start, days } = monthRange(month);
  const leading = weekdayMondayFirst(start);
  const now = today();
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={styles.wrapper}>
      <View style={styles.week}>
        {weekdayInitials(locale).map((label, i) => (
          <Text key={i} variant="caption" tone="muted" align="center" style={styles.cellWidth}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((date, i) => {
          if (!date) return <View key={`blank-${i}`} style={[styles.cellWidth, styles.cell]} />;
          const status = statuses[date];
          const meta = status !== undefined ? statusMeta(status) : null;
          const palette = meta?.color(colors);
          const isToday = date === now;
          const future = date > now;
          const label = `${formatDay(date, locale)}: ${meta ? t(meta.label) : t('status.unmarked')}`;
          return (
            <View key={date} style={[styles.cellWidth, styles.cell]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={label}
                disabled={future || !onDayPress}
                onPress={() => onDayPress?.(date)}
                style={({ pressed }) => [
                  styles.day,
                  {
                    backgroundColor: palette?.bg ?? 'transparent',
                    borderColor: isToday ? colors.text : 'transparent',
                    opacity: future ? 0.35 : pressed ? 0.7 : 1,
                  },
                ]}>
                <Text variant="label" numeric style={{ color: palette?.fg ?? colors.text }}>
                  {Number(date.slice(8))}
                </Text>
                {meta ? (
                  <Text variant="caption" style={{ color: palette?.fg, fontSize: 10, lineHeight: 12 }} numberOfLines={1}>
                    {t(meta.short)}
                  </Text>
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  week: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellWidth: { width: `${100 / 7}%` },
  cell: { padding: 2 },
  day: {
    aspectRatio: 1,
    maxHeight: 56,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
