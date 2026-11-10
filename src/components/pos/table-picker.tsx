import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listTables } from '@/db/menu';
import { listActiveOrders } from '@/db/orders';
import { useI18n } from '@/i18n';
import { useDbQuery } from '@/providers/database';
import { radius, useTheme } from '@/theme';

import { TableChairLayout } from './table-chair-layout';
import { IconButton } from '../ui/button';
import { Text } from '../ui/text';

type Props = {
  visible: boolean;
  selectedId: string | null;
  onSelect: (tableId: string) => void;
  onClose: () => void;
  title?: string;
};

/** Occupied tables can still be chosen: the new order shares the table as the next party. */
export function TablePicker({ visible, selectedId, onSelect, onClose, title }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { data: tables = [] } = useDbQuery(visible ? 'tables' : null, listTables);
  const { data: active = [] } = useDbQuery(visible ? 'active-orders' : null, listActiveOrders);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel={t('common.close')} onPress={onClose} />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            <Text variant="heading" style={styles.flex} accessibilityRole="header">
              {title ?? t('pos.chooseTable')}
            </Text>
            <IconButton icon="close" label={t('common.close')} onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={styles.grid}>
            {tables.map((table) => {
              const parties = active.filter((o) => o.table_id === table.id);
              const busy = parties.length > 0;
              const selected = table.id === selectedId;
              return (
                <Pressable
                  key={table.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${t('pos.table', { name: table.name })}, ${
                    busy ? `${parties.length} ${t('ord.open')}` : t('pos.free')
                  }`}
                  accessibilityHint={busy ? t('ord.shareHint') : undefined}
                  onPress={() => onSelect(table.id)}
                  style={({ pressed }) => [
                    styles.tile,
                    {
                      backgroundColor: busy ? colors.accentSoft : colors.surface,
                      borderColor: selected ? colors.primary : busy ? colors.accent : colors.border,
                      borderWidth: selected ? 2 : 1,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}>
                  <TableChairLayout
                    name={table.name}
                    seats={table.seats}
                    isSubTable={Boolean(table.parent_id)}
                    parentName={table.parent_name}
                    status={busy ? 'open' : 'vacant'}
                    partyLabel={busy ? parties.map((p) => p.party).join('·') : undefined}
                    size="sm"
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '80%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 8 },
  tile: {
    width: 108,
    minHeight: 88,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
});
