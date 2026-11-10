import { Pressable, StyleSheet, View } from 'react-native';

import type { Status } from '@/db/types';
import { useI18n } from '@/i18n';
import { radius, useTheme } from '@/theme';

import { Text } from '../ui/text';
import { STATUSES } from './status';

type Props = {
  value: Status | null;
  onChange: (status: Status) => void;
  workerName: string;
  size?: number;
};

export function StatusPicker({ value, onChange, workerName, size = 44 }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={workerName} style={styles.group}>
      {STATUSES.map((meta) => {
        const selected = value === meta.status;
        const { fg, bg } = meta.color(colors);
        return (
          <Pressable
            key={meta.status}
            accessibilityRole="radio"
            accessibilityLabel={t(meta.label)}
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(meta.status)}
            hitSlop={2}
            style={({ pressed }) => [
              styles.option,
              {
                width: size,
                height: size,
                backgroundColor: selected ? fg : bg,
                borderColor: selected ? fg : 'transparent',
                transform: [{ scale: pressed ? 0.92 : 1 }],
              },
            ]}>
            <Text
              variant="bodyStrong"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ color: selected ? colors.surface : fg, fontSize: 15 }}>
              {t(meta.short)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', gap: 6 },
  option: {
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
});
