import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '@/components/ui/button';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/fonts';

const icon =
  (outline: IconName, filled: IconName) =>
  ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <Ionicons name={focused ? filled : outline} color={color as string} size={size} />
  );

export default function TabLayout() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isWide, isTablet } = useResponsive();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        // Landscape tablets get a side rail; phones and portrait tablets keep a bottom bar.
        tabBarPosition: isWide ? 'left' : 'bottom',
        tabBarVariant: isWide ? 'material' : 'uikit',
        tabBarLabelPosition: isTablet && !isWide ? 'beside-icon' : 'below-icon',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: [
          { backgroundColor: colors.surface, borderTopColor: colors.border, borderRightColor: colors.border },
          // Indic scripts need extra room below the baseline for vowel signs.
          !isWide && { height: 64 + insets.bottom, paddingTop: 6, paddingBottom: insets.bottom + 6 },
        ],
        tabBarLabelStyle: { fontSize: 12, lineHeight: 18, fontWeight: '600', fontFamily },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: t('tab.menu'), tabBarIcon: icon('restaurant-outline', 'restaurant') }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: t('tab.orders'), tabBarIcon: icon('receipt-outline', 'receipt') }}
      />
      <Tabs.Screen
        name="reports"
        options={{ title: t('tab.reports'), tabBarIcon: icon('pie-chart-outline', 'pie-chart') }}
      />
      <Tabs.Screen
        name="staff"
        options={{ title: t('tab.staff'), tabBarIcon: icon('people-outline', 'people') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t('tab.settings'), tabBarIcon: icon('settings-outline', 'settings') }}
      />
    </Tabs>
  );
}
