import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n';
import { goBack } from '@/lib/navigation';
import { useTheme } from '@/theme';
import { useResponsive } from '@/hooks/use-responsive';

import { IconButton } from './button';
import { Text } from './text';

type ScreenProps = {
  children: ReactNode;
  /** Tab screens leave the bottom edge to the tab bar. */
  edges?: Edge[];
  style?: ViewStyle;
};

export function Screen({ children, edges = ['top', 'left', 'right', 'bottom'], style }: ScreenProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.screen, { backgroundColor: colors.background }, style]}>
      {children}
    </SafeAreaView>
  );
}

type HeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  back?: boolean;
  right?: ReactNode;
};

export function ScreenHeader({ title, subtitle, eyebrow, back, right }: HeaderProps) {
  const { t } = useI18n();
  const { gutter } = useResponsive();
  return (
    <View style={[styles.header, { paddingHorizontal: gutter }]}>
      {back ? (
        <IconButton
          icon="chevron-back"
          label={t('common.back')}
          onPress={() => goBack()}
          style={styles.back}
        />
      ) : null}
      <View style={styles.titles}>
        {eyebrow ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {eyebrow}
          </Text>
        ) : null}
        <Text variant={back ? 'heading' : 'title'} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

/** Centers content and caps its width so forms and lists stay readable on tablets. */
export function Content({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { contentMaxWidth } = useResponsive();
  return <View style={[styles.content, { maxWidth: contentMaxWidth }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, paddingBottom: 12, minHeight: 60 },
  back: { marginLeft: -8 },
  titles: { flex: 1, minWidth: 0 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  content: { width: '100%', alignSelf: 'center' },
});
