import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MenuItem } from '@/db/pos-types';
import { useI18n } from '@/i18n';
import { menuImageSource } from '@/lib/menu-images';
import { formatMoney } from '@/lib/money';
import { useSettings } from '@/providers/database';
import { radius, useTheme } from '@/theme';

import { Button, IconButton } from '../ui/button';
import { Text } from '../ui/text';
import { VegMark } from './menu-item-card';
import { QuantityBar } from './quantity-bar';

type Props = {
  item: MenuItem | null;
  onClose: () => void;
  qty?: number;
  onQtyChange?: (newQty: number) => void;
  onRemove?: () => void;
  onAdd?: (item: MenuItem) => void;
  showQuantity?: boolean;
};

export function DishZoomModal({
  item,
  onClose,
  qty = 0,
  onQtyChange,
  onRemove,
  onAdd,
  showQuantity = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, itemName } = useI18n();
  const settings = useSettings();

  if (!item) return null;

  const localizedName = itemName(item.id, item.name);
  const imageSrc = menuImageSource(item.image);
  const available = item.is_available === 1;

  return (
    <Modal
      visible={Boolean(item)}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        onPress={onClose}>
        <Pressable
          style={[
            styles.dialog,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingTop: Math.max(insets.top > 0 ? 12 : 16, 12),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
          onPress={(e) => e.stopPropagation()}>
          {/* Header with Close (X) button */}
          <View style={styles.topBar}>
            <View style={styles.topBarText}>
              <Text variant="heading" numberOfLines={1}>
                {localizedName}
              </Text>
              {localizedName !== item.name ? (
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {item.name}
                </Text>
              ) : null}
            </View>
            <IconButton
              icon="close"
              label={t('common.close')}
              variant="secondary"
              onPress={onClose}
            />
          </View>

          {/* Zoomed Image View */}
          <View style={[styles.imageWrap, { backgroundColor: colors.surfaceMuted }]}>
            {imageSrc ? (
              <Image
                source={imageSrc}
                style={styles.zoomedImage}
                contentFit="contain"
                transition={200}
              />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="fast-food-outline" size={64} color={colors.textMuted} />
              </View>
            )}
            <View style={styles.vegBadge}>
              <VegMark veg={item.is_veg === 1} size={18} />
            </View>
          </View>

          {/* Details Row */}
          <View style={styles.detailsRow}>
            <View>
              <Text variant="title" tone="primary" numeric>
                {formatMoney(item.price, settings.currency)}
              </Text>
              <Text variant="caption" tone={available ? 'muted' : 'danger'}>
                {available ? t('menu.available') : t('pos.unavailable')}
              </Text>
            </View>
            {qty > 0 ? (
              <View style={[styles.inCartBadge, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="cart-outline" size={16} color={colors.primary} />
                <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                  {t('pos.inCart', { count: qty })}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Quantity Controls */}
          {showQuantity && available ? (
            <View style={styles.quantitySection}>
              {qty > 0 && onQtyChange ? (
                <QuantityBar
                  value={qty}
                  onChange={onQtyChange}
                  label={localizedName}
                  onRemove={onRemove}
                />
              ) : onAdd ? (
                <Button
                  label={t('pos.addMore')}
                  icon="add"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={() => onAdd(item)}
                />
              ) : null}
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialog: {
    width: '100%',
    maxWidth: 460,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 16,
    gap: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  topBarText: {
    flex: 1,
  },
  imageWrap: {
    width: '100%',
    height: 280,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomedImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 3,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  inCartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  quantitySection: {
    marginTop: 4,
  },
});
