import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { listTables } from '@/db/menu';
import type { OrderType } from '@/db/pos-types';
import { useI18n } from '@/i18n';
import { confirm } from '@/lib/confirm';
import { useCart } from '@/providers/cart';
import { useDbQuery } from '@/providers/database';
import { radius, useTheme } from '@/theme';

import { Button } from '../ui/button';
import { Segmented } from '../ui/primitives';
import { Text } from '../ui/text';
import { TablePicker } from './table-picker';

/** Chooses who the order is for: a table (shared tables get the next party letter) or a takeaway token. */
export function OrderTarget() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const cart = useCart();
  const { draft } = cart;
  const [picking, setPicking] = useState(false);
  const { data: tables = [] } = useDbQuery('tables', listTables);
  const table = tables.find((tb) => tb.id === draft.tableId);

  if (draft.orderId) {
    return (
      <View style={[styles.editing, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
        <Ionicons name="create-outline" size={18} color={colors.accent} />
        <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
          {t('pos.editing', { label: draft.label ?? '' })}
        </Text>
        <Button
          label={t('form.cancel')}
          variant="ghost"
          onPress={async () => {
            const ok = await confirm({
              title: t('pos.discardTitle'),
              confirmLabel: t('common.confirm'),
              cancelLabel: t('form.cancel'),
              destructive: true,
            });
            if (ok) cart.reset();
          }}
        />
      </View>
    );
  }

  const setType = (type: OrderType) => {
    cart.setTarget(type, draft.tableId);
    if (type === 'dine_in' && !draft.tableId) setPicking(true);
  };

  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Segmented<OrderType>
          label={t('pos.cart')}
          value={draft.type}
          onChange={setType}
          options={[
            { value: 'dine_in', label: t('pos.dineIn') },
            { value: 'takeaway', label: t('pos.takeaway') },
          ]}
        />
      </View>
      {draft.type === 'dine_in' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={table ? t('pos.table', { name: table.name }) : t('pos.chooseTable')}
          onPress={() => setPicking(true)}
          style={({ pressed }) => [
            styles.tableButton,
            {
              backgroundColor: table ? colors.primary : colors.surface,
              borderColor: table ? colors.primary : colors.danger,
              opacity: pressed ? 0.85 : 1,
            },
          ]}>
          <Ionicons name="grid-outline" size={16} color={table ? colors.onPrimary : colors.danger} />
          <Text variant="bodyStrong" style={{ color: table ? colors.onPrimary : colors.danger }} numberOfLines={1}>
            {table ? table.name : t('pos.chooseTable')}
          </Text>
        </Pressable>
      ) : null}
      <TablePicker
        visible={picking}
        selectedId={draft.tableId}
        onClose={() => setPicking(false)}
        onSelect={(id) => {
          cart.setTarget('dine_in', id);
          setPicking(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tableButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 160,
  },
  editing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingLeft: 12,
    minHeight: 48,
  },
});
