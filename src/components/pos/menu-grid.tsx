import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { type ReactElement, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import type { Category, MenuItem } from '@/db/pos-types';
import { useI18n } from '@/i18n';
import { selectionFeedback } from '@/lib/haptics';
import { useCart } from '@/providers/cart';
import { useSettings } from '@/providers/database';

import { Chip, ChipRow, EmptyState } from '../ui/primitives';
import { Text } from '../ui/text';
import { TextField } from '../ui/text-field';
import { DishZoomModal } from './dish-zoom-modal';
import { MenuItemCard } from './menu-item-card';

type Row =
  | { kind: 'header'; key: string; category: Category; count: number }
  | { kind: 'items'; key: string; items: (MenuItem | null)[] };

const MIN_CARD = 112;
const GAP = 8;

type Props = {
  categories: Category[];
  items: MenuItem[];
  gutter: number;
  header?: ReactElement;
  bottomInset: number;
};

/** Dishes grouped by category with photos; the chip bar jumps to a category. */
export function MenuGrid({ categories, items, gutter, header, bottomInset }: Props) {
  const { t, itemName, categoryName } = useI18n();
  const { currency } = useSettings();
  const cart = useCart();
  const list = useRef<FlashListRef<Row>>(null);
  const [width, setWidth] = useState(0);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const [zoomedItem, setZoomedItem] = useState<MenuItem | null>(null);

  const columns = Math.max(2, Math.min(6, Math.floor((width - gutter * 2 + GAP) / (MIN_CARD + GAP)) || 3));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: Row[] = [];
    for (const category of categories) {
      if (category.is_active !== 1) continue;
      const catItems = items.filter(
        (i) =>
          i.category_id === category.id &&
          (!q || `${i.name} ${itemName(i.id, i.name)}`.toLowerCase().includes(q)),
      );
      if (catItems.length === 0) continue;
      out.push({ kind: 'header', key: `h-${category.id}`, category, count: catItems.length });
      for (let i = 0; i < catItems.length; i += columns) {
        const chunk: (MenuItem | null)[] = catItems.slice(i, i + columns);
        while (chunk.length < columns) chunk.push(null);
        out.push({ kind: 'items', key: `r-${category.id}-${i}-${columns}`, items: chunk });
      }
    }
    return out;
  }, [categories, items, query, columns, itemName]);

  const jumpTo = (categoryId: string | null) => {
    setActive(categoryId);
    if (!categoryId) {
      list.current?.scrollToOffset({ offset: 0, animated: true });
      return;
    }
    const index = rows.findIndex((r) => r.kind === 'header' && r.category.id === categoryId);
    if (index >= 0) list.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
  };

  const add = (item: MenuItem) => {
    selectionFeedback();
    const cat = categories.find((c) => c.id === item.category_id);
    cart.add(item, cat?.name ?? '');
  };

  return (
    <View style={styles.flex} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <View style={[styles.filters, { paddingHorizontal: gutter }]}>
        {header}
        <TextField
          icon="search"
          placeholder={t('pos.search')}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {!query ? (
          <ChipRow>
            <Chip label={t('att.all')} selected={active === null} onPress={() => jumpTo(null)} />
            {categories
              .filter((c) => c.is_active === 1 && items.some((i) => i.category_id === c.id))
              .map((c) => (
                <Chip key={c.id} label={categoryName(c.id, c.name)} selected={active === c.id} onPress={() => jumpTo(c.id)} />
              ))}
          </ChipRow>
        ) : null}
      </View>
      {width > 0 ? (
        <FlashList
          ref={list}
          data={rows}
          keyExtractor={(r) => r.key}
          getItemType={(r) => r.kind}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: bottomInset }}
          ListEmptyComponent={<EmptyState icon="search" title={t('att.noResults')} />}
          renderItem={({ item: row }) =>
            row.kind === 'header' ? (
              <View style={styles.sectionHeader}>
                <Text variant="heading" accessibilityRole="header">
                  {categoryName(row.category.id, row.category.name)}
                </Text>
                <Text variant="caption" tone="muted">
                  {row.count}
                </Text>
              </View>
            ) : (
              <View style={styles.row}>
                {row.items.map((item, i) =>
                  item ? (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      qty={cart.qtyByItem.get(item.id) ?? 0}
                      currency={currency}
                      onAdd={add}
                      onPressImage={(it) => setZoomedItem(it)}
                    />
                  ) : (
                    <View key={`empty-${i}`} style={styles.flex} />
                  ),
                )}
              </View>
            )
          }
        />
      ) : null}

      <DishZoomModal
        item={zoomedItem}
        onClose={() => setZoomedItem(null)}
        qty={zoomedItem ? (cart.qtyByItem.get(zoomedItem.id) ?? 0) : 0}
        onAdd={add}
        onQtyChange={(nextQty) => {
          if (!zoomedItem) return;
          const index = cart.draft.lines.findIndex((l) => l.item_id === zoomedItem.id);
          if (index >= 0) {
            cart.setQty(index, nextQty);
          } else {
            add(zoomedItem);
          }
        }}
        onRemove={() => {
          if (!zoomedItem) return;
          const index = cart.draft.lines.findIndex((l) => l.item_id === zoomedItem.id);
          if (index >= 0) cart.remove(index);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  filters: { gap: 10, paddingBottom: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: 16, paddingBottom: 8 },
  row: { flexDirection: 'row', gap: GAP, paddingBottom: GAP },
});
