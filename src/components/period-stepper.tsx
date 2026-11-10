import { Pressable, StyleSheet, View } from 'react-native';

import { radius, useTheme } from '@/theme';

import { IconButton } from './ui/button';
import { Text } from './ui/text';

type Props = {
  title: string;
  subtitle?: string;
  onPrevious: () => void;
  onNext: () => void;
  previousLabel: string;
  nextLabel: string;
  nextDisabled?: boolean;
  /** Tapping the title jumps back to the current period. */
  onReset?: () => void;
  resetHint?: string;
  compact?: boolean;
};

export function PeriodStepper({
  title,
  subtitle,
  onPrevious,
  onNext,
  previousLabel,
  nextLabel,
  nextDisabled,
  onReset,
  resetHint,
  compact,
}: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <IconButton icon="chevron-back" label={previousLabel} onPress={onPrevious} />
      <Pressable
        accessibilityRole={onReset ? 'button' : undefined}
        accessibilityHint={onReset ? resetHint : undefined}
        disabled={!onReset}
        onPress={onReset}
        style={styles.center}>
        <Text variant={compact ? 'bodyStrong' : 'heading'} align="center" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" align="center" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </Pressable>
      <IconButton icon="chevron-forward" label={nextLabel} onPress={onNext} disabled={nextDisabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 4,
    gap: 4,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 0 },
});
