import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { MIN_TOUCH, type Palette, radius, useTheme } from '@/theme';

import { Text } from './text';

export type IconName = ComponentProps<typeof Ionicons>['name'];
type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';

function variantColors(colors: Palette, variant: Variant) {
  switch (variant) {
    case 'primary':
      return { bg: colors.primary, fg: colors.onPrimary, border: colors.primary };
    case 'secondary':
      return { bg: colors.surface, fg: colors.text, border: colors.border };
    case 'soft':
      return { bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoft };
    case 'danger':
      return { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft };
    default:
      return { bg: 'transparent', fg: colors.text, border: 'transparent' };
  }
}

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  size = 'md',
  disabled,
  loading,
  fullWidth,
  style,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme();
  const c = variantColors(colors, variant);
  const inactive = disabled || loading;

  const btnHeight = size === 'lg' ? 52 : size === 'sm' ? 34 : MIN_TOUCH;
  const paddingH = size === 'sm' ? 10 : 16;
  const iconSize = size === 'sm' ? 16 : 18;
  const fontSize = size === 'sm' ? 13 : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          height: btnHeight,
          paddingHorizontal: paddingH,
          backgroundColor: c.bg,
          borderColor: c.border,
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        fullWidth && styles.fullWidth,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={c.fg} size={size === 'sm' ? 'small' : undefined} />
      ) : (
        <View style={[styles.inner, size === 'sm' && { gap: 6 }]}>
          {icon ? <Ionicons name={icon} size={iconSize} color={c.fg} /> : null}
          <Text variant="label" style={{ color: c.fg, fontWeight: '600', fontSize }} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

type IconButtonProps = {
  icon: IconName;
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
};

export function IconButton({ icon, label, onPress, variant = 'ghost', disabled, style }: IconButtonProps) {
  const { colors } = useTheme();
  const c = variantColors(colors, variant);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.icon,
        { backgroundColor: pressed && variant === 'ghost' ? colors.surfaceMuted : c.bg, opacity: disabled ? 0.4 : 1 },
        style,
      ]}>
      <Ionicons name={icon} size={22} color={c.fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fullWidth: { alignSelf: 'stretch' },
  icon: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
