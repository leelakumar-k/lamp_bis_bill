import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { MIN_TOUCH, radius, useTheme } from '@/theme';

import type { IconName } from './button';
import { Text } from './text';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

type ChipProps = { label: string; selected?: boolean; onPress: () => void };

export function Chip({ label, selected, onPress }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.text : colors.surface,
          borderColor: selected ? colors.text : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      <Text variant="label" style={{ color: selected ? colors.background : colors.text }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipRow({ children, wrap }: { children: ReactNode; wrap?: boolean }) {
  if (wrap) return <View style={styles.chipWrap}>{children}</View>;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.chipScroll}>
      {children}
    </ScrollView>
  );
}

type Option<T extends string> = { value: T; label: string };

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.segmented, { backgroundColor: colors.surfaceMuted }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              selected && { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}>
            <Text variant="label" tone={selected ? 'default' : 'muted'} numberOfLines={2} align="center">
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  children,
}: {
  icon: IconName;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      {body ? (
        <Text tone="muted" align="center" style={styles.emptyBody}>
          {body}
        </Text>
      ) : null}
      {children ? <View style={styles.emptyActions}>{children}</View> : null}
    </View>
  );
}

const avatarTones = ['primary', 'accent', 'neutral'] as const;

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join('')
    .toUpperCase();
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const tone = avatarTones[Math.abs(hash) % avatarTones.length];
  const bg = tone === 'primary' ? colors.primarySoft : tone === 'accent' ? colors.accentSoft : colors.surfaceMuted;
  const fg = tone === 'primary' ? colors.primary : tone === 'accent' ? colors.accent : colors.textMuted;

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.avatar, { width: size, height: size, backgroundColor: bg }]}>
      <Text variant="bodyStrong" style={{ color: fg, fontSize: size * 0.36 }}>
        {initials}
      </Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text variant="caption" tone="muted" style={styles.sectionTitle} accessibilityRole="header">
      {children.toUpperCase()}
    </Text>
  );
}

type ListRowProps = {
  icon?: IconName;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  right?: ReactNode;
  last?: boolean;
};

export function ListRow({ icon, title, subtitle, value, onPress, destructive, right, last }: ListRowProps) {
  const { colors } = useTheme();
  const color = destructive ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
        pressed && { backgroundColor: colors.surfaceMuted },
      ]}>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: destructive ? colors.dangerSoft : colors.surfaceMuted }]}>
          <Ionicons name={icon} size={18} color={destructive ? colors.danger : colors.textMuted} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text variant="bodyStrong" style={{ color }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="label" tone="muted" numberOfLines={1} style={styles.rowValue}>
          {value}
        </Text>
      ) : null}
      {right}
      {onPress && !right ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  chipScroll: { gap: 8, paddingVertical: 2 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segmented: { flexDirection: 'row', borderRadius: radius.md, padding: 4, gap: 4 },
  segment: {
    flex: 1,
    minHeight: MIN_TOUCH - 4,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 8 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyBody: { maxWidth: 320 },
  emptyActions: { marginTop: 12, gap: 8, alignItems: 'center' },
  avatar: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { letterSpacing: 0.6, marginBottom: 8, marginTop: 8, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 60, paddingVertical: 10 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  rowValue: { maxWidth: '45%' },
});
