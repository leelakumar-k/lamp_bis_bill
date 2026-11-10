import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { AttendanceRow as Row, Status } from '@/db/types';
import { useI18n } from '@/i18n';
import { formatMoney } from '@/lib/money';
import { useSettings } from '@/providers/database';
import { radius, useTheme } from '@/theme';

import { Avatar } from '../ui/primitives';
import { Text } from '../ui/text';
import { StatusPicker } from './status-picker';

type Props = {
  row: Row;
  compact: boolean;
  onChange: (row: Row, status: Status) => void;
};

export const AttendanceRow = memo(function AttendanceRow({ row, compact, onChange }: Props) {
  const { colors } = useTheme();
  const { workerName, profession, t } = useI18n();
  const { currency } = useSettings();
  const name = workerName(row.worker_id, row);
  const unmarked = row.status === null;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: unmarked ? colors.border : 'transparent' },
      ]}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={name}
        accessibilityHint={profession(row.profession)}
        onPress={() => router.push(`/worker/${row.worker_id}`)}
        style={styles.person}>
        {compact ? null : <Avatar name={`${row.first_name} ${row.last_name ?? ''}`} size={44} />}
        <View style={styles.text}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {profession(row.profession)} · {formatMoney(row.wage_snapshot ?? row.daily_wage, currency)}
          </Text>
          {unmarked ? <Text style={styles.srOnly}>{t('status.unmarked')}</Text> : null}
        </View>
      </Pressable>
      <StatusPicker
        value={row.status}
        workerName={name}
        size={compact ? 40 : 44}
        onChange={(status) => onChange(row, status)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0, minHeight: 44 },
  text: { flex: 1, minWidth: 0 },
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
