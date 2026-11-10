import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Worker } from '@/db/types';
import { useI18n } from '@/i18n';
import { formatMoney } from '@/lib/money';
import { useSettings } from '@/providers/database';
import { radius, useTheme } from '@/theme';

import { Avatar } from '../ui/primitives';
import { Text } from '../ui/text';

export const WorkerRow = memo(function WorkerRow({ worker }: { worker: Worker }) {
  const { colors } = useTheme();
  const { t, workerName, profession } = useI18n();
  const { currency } = useSettings();
  const name = workerName(worker.id, worker);
  const inactive = worker.is_active === 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${profession(worker.profession)}`}
      onPress={() => router.push(`/worker/${worker.id}`)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surfaceMuted : colors.surface, borderColor: colors.border },
      ]}>
      <View style={{ opacity: inactive ? 0.5 : 1 }}>
        <Avatar name={`${worker.first_name} ${worker.last_name ?? ''}`} />
      </View>
      <View style={styles.text}>
        <View style={styles.nameRow}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.shrink}>
            {name}
          </Text>
          {inactive ? (
            <View style={[styles.badge, { backgroundColor: colors.surfaceMuted }]}>
              <Text variant="caption" tone="muted">
                {t('workers.inactive')}
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {[profession(worker.profession), worker.mobile].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text variant="label" numeric>
        {t('workers.perDay', { amount: formatMoney(worker.daily_wage, currency) })}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 68,
  },
  text: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shrink: { flexShrink: 1 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
});
