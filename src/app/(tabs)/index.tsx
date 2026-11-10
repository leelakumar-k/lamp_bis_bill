import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { LicenseBanner } from '@/components/license-banner';
import { CartPanel } from '@/components/pos/cart-panel';
import { MenuGrid } from '@/components/pos/menu-grid';
import { OrderTarget } from '@/components/pos/order-target';
import { Button, IconButton } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/primitives';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { listCategories, listItems } from '@/db/menu';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/i18n';
import { formatMoney } from '@/lib/money';
import { useCart } from '@/providers/cart';
import { useDbQuery, useSettings } from '@/providers/database';
import { radius, useTheme } from '@/theme';

export default function MenuScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const settings = useSettings();
  const { isWide, gutter } = useResponsive();
  const cart = useCart();
  const { data: categories = [] } = useDbQuery('categories', listCategories);
  const { data: items = [], isLoading } = useDbQuery('items', listItems);

  const header = (
    <>
      <ScreenHeader
        eyebrow={settings.businessName || 'Muster'}
        title={t('tab.menu')}
        right={
          <IconButton
            icon="create-outline"
            label={t('pos.manageMenu')}
            variant="soft"
            onPress={() => router.push('/menu')}
          />
        }
      />
      <LicenseBanner />
    </>
  );

  if (!isLoading && items.length === 0) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        {header}
        <EmptyState icon="restaurant-outline" title={t('pos.noMenu')} body={t('pos.noMenuBody')}>
          <Button label={t('pos.manageMenu')} icon="create-outline" onPress={() => router.push('/menu')} />
        </EmptyState>
      </Screen>
    );
  }

  if (isWide) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <View style={styles.split}>
          <View style={styles.flex}>
            {header}
            <MenuGrid categories={categories} items={items} gutter={gutter} bottomInset={24} />
          </View>
          <View style={[styles.cartPane, { borderLeftColor: colors.border, backgroundColor: colors.background }]}>
            <CartPanel />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      {header}
      <MenuGrid
        categories={categories}
        items={items}
        gutter={gutter}
        header={<OrderTarget />}
        bottomInset={cart.count > 0 ? 96 : 24}
      />
      {cart.count > 0 ? (
        <View style={[styles.floating, { left: gutter, right: gutter }]} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('pos.viewOrder')}, ${t('pos.items', { count: cart.count })}, ${formatMoney(
              cart.subtotal,
              settings.currency,
            )}`}
            onPress={() => router.push('/cart')}
            style={({ pressed }) => [
              styles.cartBar,
              { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}>
            <View style={[styles.count, { backgroundColor: colors.onPrimary }]}>
              <Text variant="bodyStrong" numeric style={{ color: colors.primary }}>
                {cart.count}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text variant="caption" style={{ color: colors.onPrimary, opacity: 0.85 }} numberOfLines={1}>
                {cart.draft.orderId ? cart.draft.label : t('pos.items', { count: cart.count })}
              </Text>
              <Text variant="heading" numeric style={{ color: colors.onPrimary }}>
                {formatMoney(cart.subtotal, settings.currency)}
              </Text>
            </View>
            <Text variant="bodyStrong" style={{ color: colors.onPrimary }}>
              {t('pos.viewOrder')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.onPrimary} />
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  split: { flex: 1, flexDirection: 'row' },
  cartPane: { width: 400, borderLeftWidth: StyleSheet.hairlineWidth },
  floating: { position: 'absolute', bottom: 12 },
  cartBar: {
    minHeight: 60,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  count: { minWidth: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
});
