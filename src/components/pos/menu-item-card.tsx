import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { MenuItem } from '@/db/pos-types';
import { useI18n } from '@/i18n';
import { menuImageSource } from '@/lib/menu-images';
import { formatMoney } from '@/lib/money';
import { radius, useTheme } from '@/theme';

import { Text } from '../ui/text';

/** The Indian food-type mark: a square outline with a dot, green for veg and red for non-veg. */
export function VegMark({ veg, size = 14 }: { veg: boolean; size?: number }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const color = veg ? colors.primary : colors.danger;
  return (
    <View
      accessible
      accessibilityLabel={veg ? t('pos.veg') : t('pos.nonVeg')}
      style={[styles.mark, { width: size, height: size, borderColor: color, backgroundColor: colors.surface }]}>
      <View style={{ width: size * 0.45, height: size * 0.45, borderRadius: size, backgroundColor: color }} />
    </View>
  );
}

type Props = {
  item: MenuItem;
  qty: number;
  currency: string;
  onAdd: (item: MenuItem) => void;
  onPressImage?: (item: MenuItem) => void;
};

export const MenuItemCard = memo(function MenuItemCard({ item, qty, currency, onAdd, onPressImage }: Props) {
  const { colors } = useTheme();
  const { t, itemName } = useI18n();
  const name = itemName(item.id, item.name);
  const available = item.is_available === 1;
  const source = menuImageSource(item.image);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${formatMoney(item.price, currency)}`}
      accessibilityHint={available ? (qty ? t('pos.inCart', { count: qty }) : undefined) : t('pos.unavailable')}
      accessibilityState={{ disabled: !available }}
      disabled={!available}
      onPress={() => onAdd(item)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: qty ? colors.primary : colors.border,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          opacity: available ? 1 : 0.5,
        },
      ]}>
      <Pressable
        onPress={(e) => {
          if (onPressImage) {
            e.stopPropagation();
            onPressImage(item);
          }
        }}
        style={[styles.imageWrap, { backgroundColor: colors.surfaceMuted }]}>
        {source ? (
          <Image source={source} style={styles.image} contentFit="cover" transition={150} recyclingKey={item.id} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="restaurant-outline" size={28} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.markWrap}>
          <VegMark veg={item.is_veg === 1} />
        </View>
        {qty > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text variant="caption" numeric style={{ color: colors.onPrimary, fontWeight: '700' }}>
              {qty}
            </Text>
          </View>
        ) : null}
      </Pressable>
      <View style={styles.body}>
        <Text variant="label" numberOfLines={2} style={styles.name}>
          {name}
        </Text>
        <Text variant="bodyStrong" numeric>
          {available ? formatMoney(item.price, currency) : t('pos.unavailable')}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: radius.md, borderWidth: 1.5, overflow: 'hidden' },
  imageWrap: { aspectRatio: 4 / 3, width: '100%' },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  markWrap: { position: 'absolute', top: 6, left: 6, borderRadius: 3 },
  mark: { borderWidth: 1.5, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 8, gap: 2 },
  name: { minHeight: 40, fontWeight: '600' },
});
