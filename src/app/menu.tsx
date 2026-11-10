import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TableChairLayout } from '@/components/pos/table-chair-layout';
import { VegMark } from '@/components/pos/menu-item-card';
import { DishZoomModal } from '@/components/pos/dish-zoom-modal';
import { useToast } from '@/components/toast';
import { Button, IconButton } from '@/components/ui/button';
import { Card, Chip, ChipRow, EmptyState, Segmented } from '@/components/ui/primitives';
import { Content, Screen, ScreenHeader } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import {
  deleteCategory,
  deleteItem,
  deleteTable,
  isItemNameTaken,
  isTableNameTaken,
  listCategories,
  listItems,
  listTables,
  moveCategory,
  saveCategory,
  saveItem,
  saveTable,
  setItemAvailable,
} from '@/db/menu';
import type { Category, DiningTable, MenuItem } from '@/db/pos-types';
import { categoryKey, itemKey, setOverride } from '@/db/translations';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/i18n';
import { getLanguage } from '@/i18n/languages';
import { confirm, notify } from '@/lib/confirm';
import { pickDishPhoto, takeDishPhoto } from '@/lib/dish-images';
import { menuImageSource } from '@/lib/menu-images';
import { formatMoney, minorToInput, toMinor } from '@/lib/money';
import { transliterateTo } from '@/lib/transliterate';
import { useDb, useDbQuery, useRevalidateAll, useSettings } from '@/providers/database';
import { radius, useTheme } from '@/theme';

type Tab = 'items' | 'categories' | 'tables';

const SEAT_PRESETS = [2, 4, 6, 8, 10, 12];

export default function MenuManagementScreen() {
  const db = useDb();
  const settings = useSettings();
  const revalidateAll = useRevalidateAll();
  const toast = useToast();
  const { t, itemName, categoryName, overrides } = useI18n();
  const { colors } = useTheme();
  const { gutter } = useResponsive();

  const currentLang = useMemo(() => getLanguage(settings.language), [settings.language]);
  const isEnglish = currentLang.code === 'en';

  const [activeTab, setActiveTab] = useState<Tab>('items');
  const [query, setQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [zoomedDish, setZoomedDish] = useState<MenuItem | null>(null);

  // 1. DISH MODAL STATE
  const [itemModal, setItemModal] = useState<MenuItem | null | 'new'>(null);
  const [itemNameInput, setItemNameInput] = useState('');
  const [itemLocalNameInput, setItemLocalNameInput] = useState('');
  const [itemCatIdInput, setItemCatIdInput] = useState('');
  const [itemPriceInput, setItemPriceInput] = useState('');
  const [itemImageInput, setItemImageInput] = useState<string | null>(null);
  const [itemVegInput, setItemVegInput] = useState(true);
  const [itemAvailInput, setItemAvailInput] = useState(true);

  // 2. CATEGORY MODAL STATE
  const [catModal, setCatModal] = useState<Category | null | 'new'>(null);
  const [catNameInput, setCatNameInput] = useState('');
  const [catLocalNameInput, setCatLocalNameInput] = useState('');

  // 3. TABLE MODAL STATE
  const [tableModal, setTableModal] = useState<DiningTable | null | 'new'>(null);
  const [tableNameInput, setTableNameInput] = useState('');
  const [tableSeatsInput, setTableSeatsInput] = useState('4');
  const [tableIsSubInput, setTableIsSubInput] = useState(false);
  const [tableParentIdInput, setTableParentIdInput] = useState<string | null>(null);

  const { data: categories = [] } = useDbQuery('categories', listCategories);
  const { data: items = [] } = useDbQuery('items', listItems);
  const { data: tables = [] } = useDbQuery('tables', listTables);

  // Filter root tables that can act as parents
  const rootTables = useMemo(
    () => tables.filter((tb) => !tb.parent_id && (tableModal === 'new' || tb.id !== tableModal?.id)),
    [tables, tableModal],
  );

  // Live duplicate and partial match computation while typing dish name
  const currentEditingDishId = itemModal && itemModal !== 'new' ? itemModal.id : null;
  const trimmedDishName = itemNameInput.trim().toLowerCase();

  const { exactDuplicate, matchedDishes } = useMemo(() => {
    if (!trimmedDishName) {
      return { exactDuplicate: null, matchedDishes: [] };
    }
    const otherItems = items.filter((it) => it.id !== currentEditingDishId);

    // Exact duplicate (case-insensitive)
    const exact = otherItems.find((it) => it.name.trim().toLowerCase() === trimmedDishName) ?? null;

    // Partial matches: items that include the typed query (or query includes item)
    const matches = otherItems
      .filter((it) => {
        if (it.id === exact?.id) return false;
        const itNameLower = it.name.toLowerCase();
        return itNameLower.includes(trimmedDishName) || trimmedDishName.includes(itNameLower);
      })
      .slice(0, 5);

    return { exactDuplicate: exact, matchedDishes: matches };
  }, [trimmedDishName, items, currentEditingDishId]);

  // 1. DISH ACTIONS
  const openItemModal = (item?: MenuItem) => {
    if (item) {
      setItemModal(item);
      setItemNameInput(item.name);
      const existingTranslation = overrides[itemKey(item.id)] ?? '';
      setItemLocalNameInput(existingTranslation || transliterateTo(item.name, currentLang.code));
      setItemCatIdInput(item.category_id);
      setItemPriceInput(minorToInput(item.price));
      setItemImageInput(item.image);
      setItemVegInput(item.is_veg === 1);
      setItemAvailInput(item.is_available === 1);
    } else {
      if (categories.length === 0) {
        notify(t('menu.category'), 'Please add at least one category (e.g. Tiffin, Beverages) before adding dishes.');
        setActiveTab('categories');
        openCatModal();
        return;
      }
      setItemModal('new');
      setItemNameInput('');
      setItemLocalNameInput('');
      setItemCatIdInput(categories[0]?.id ?? '');
      setItemPriceInput('');
      setItemImageInput(null);
      setItemVegInput(true);
      setItemAvailInput(true);
    }
  };

  const handleDishNameChange = (name: string) => {
    setItemNameInput(name);
    if (!isEnglish) {
      setItemLocalNameInput(transliterateTo(name, currentLang.code));
    }
  };

  const handleTakeDishPhoto = async () => {
    const uri = await takeDishPhoto();
    if (uri) setItemImageInput(uri);
  };

  const handlePickDishPhoto = async () => {
    const uri = await pickDishPhoto();
    if (uri) setItemImageInput(uri);
  };

  const saveDish = async () => {
    const trimmedName = itemNameInput.trim();
    const minor = toMinor(itemPriceInput);
    if (!trimmedName || !itemCatIdInput || minor === null || minor < 0) {
      notify(t('form.required'), t('form.invalidAmount'));
      return;
    }

    // Check duplicate dish name (case-insensitive)
    const duplicate = await isItemNameTaken(
      db,
      trimmedName,
      itemModal === 'new' ? undefined : itemModal?.id,
    );

    if (duplicate) {
      const priceFormatted = formatMoney(duplicate.price, settings.currency);
      const shouldEdit = await confirm({
        title: t('menu.nameTaken'),
        message: t('menu.nameTakenBody', {
          name: duplicate.name,
          price: priceFormatted,
        }),
        confirmLabel: t('menu.editExisting'),
        cancelLabel: t('form.cancel'),
      });

      if (shouldEdit) {
        const target = items.find((it) => it.id === duplicate.id);
        if (target) {
          openItemModal(target);
        }
      }
      return;
    }

    const input = {
      name: trimmedName,
      category_id: itemCatIdInput,
      price: minor,
      image: itemImageInput,
      is_veg: itemVegInput,
      is_available: itemAvailInput,
    };
    const savedId = await saveItem(db, input, itemModal === 'new' ? undefined : itemModal?.id);

    // Persist localized name to translations override
    if (!isEnglish && itemLocalNameInput.trim()) {
      await setOverride(db, currentLang.code, itemKey(savedId), itemLocalNameInput.trim());
    }

    setItemModal(null);
    await revalidateAll();
  };

  const removeDish = async (dish: MenuItem) => {
    const ok = await confirm({
      title: t('menu.deleteItemTitle'),
      message: t('menu.deleteItemBody'),
      confirmLabel: t('form.delete'),
      cancelLabel: t('form.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await deleteItem(db, dish.id);
    if (itemModal) setItemModal(null);
    await revalidateAll();
  };

  const toggleAvailable = async (dish: MenuItem) => {
    await setItemAvailable(db, dish.id, dish.is_available !== 1);
    await revalidateAll();
  };

  // 2. CATEGORY ACTIONS
  const openCatModal = (cat?: Category) => {
    if (cat) {
      setCatModal(cat);
      setCatNameInput(cat.name);
      const existing = overrides[categoryKey(cat.id)] ?? '';
      setCatLocalNameInput(existing || transliterateTo(cat.name, currentLang.code));
    } else {
      setCatModal('new');
      setCatNameInput('');
      setCatLocalNameInput('');
    }
  };

  const handleCatNameChange = (name: string) => {
    setCatNameInput(name);
    if (!isEnglish) {
      setCatLocalNameInput(transliterateTo(name, currentLang.code));
    }
  };

  const saveCat = async () => {
    if (!catNameInput.trim()) return;
    const savedId = await saveCategory(db, catNameInput.trim(), catModal === 'new' ? undefined : catModal?.id);

    // Save translation
    if (!isEnglish && catLocalNameInput.trim()) {
      await setOverride(db, currentLang.code, categoryKey(savedId), catLocalNameInput.trim());
    }

    setCatModal(null);
    await revalidateAll();
  };

  const removeCat = async (cat: Category) => {
    const ok = await confirm({
      title: t('menu.deleteCategoryTitle'),
      confirmLabel: t('form.delete'),
      cancelLabel: t('form.cancel'),
      destructive: true,
    });
    if (!ok) return;
    const deleted = await deleteCategory(db, cat.id);
    if (!deleted) {
      notify(t('menu.deleteCategoryTitle'), t('menu.categoryNotEmpty'));
      return;
    }
    setCatModal(null);
    await revalidateAll();
  };

  // 3. TABLE ACTIONS
  const openTableModal = (tb?: DiningTable) => {
    if (tb) {
      setTableModal(tb);
      setTableNameInput(tb.name);
      setTableSeatsInput(String(tb.seats));
      setTableIsSubInput(Boolean(tb.parent_id));
      setTableParentIdInput(tb.parent_id ?? null);
    } else {
      setTableModal('new');
      setTableNameInput('');
      setTableSeatsInput('4');
      setTableIsSubInput(false);
      setTableParentIdInput(null);
    }
  };

  const handleSubTableToggle = (isSub: boolean) => {
    if (isSub && rootTables.length === 0) {
      notify(t('tbl.add'), 'Please create a main table first before creating sub-tables.');
      return;
    }
    setTableIsSubInput(isSub);
    if (isSub) {
      const defaultParent = rootTables[0];
      const parentId = defaultParent?.id ?? null;
      setTableParentIdInput(parentId);
      if (defaultParent && (!tableNameInput || tableNameInput.startsWith('T'))) {
        const existingSubs = tables.filter((t) => t.parent_id === defaultParent.id);
        const nextChar = String.fromCharCode(65 + existingSubs.length); // 'A', 'B', etc.
        setTableNameInput(`${defaultParent.name}-${nextChar}`);
      }
    } else {
      setTableParentIdInput(null);
    }
  };

  const handleParentSelect = (parentId: string) => {
    setTableParentIdInput(parentId);
    const parent = rootTables.find((r) => r.id === parentId);
    if (parent) {
      const existingSubs = tables.filter((t) => t.parent_id === parent.id);
      const nextChar = String.fromCharCode(65 + existingSubs.length);
      setTableNameInput(`${parent.name}-${nextChar}`);
    }
  };

  const adjustSeats = (delta: number) => {
    const current = parseInt(tableSeatsInput, 10) || 4;
    const next = Math.max(1, Math.min(30, current + delta));
    setTableSeatsInput(String(next));
  };

  const saveTableData = async () => {
    const name = tableNameInput.trim();
    const seats = parseInt(tableSeatsInput, 10) || 4;
    if (!name) return;
    const isTaken = await isTableNameTaken(
      db,
      name,
      tableModal === 'new' ? undefined : tableModal?.id,
    );
    if (isTaken) {
      notify(t('tbl.add'), t('tbl.nameTaken'));
      return;
    }
    const parentId = tableIsSubInput ? tableParentIdInput : null;
    await saveTable(db, name, seats, tableModal === 'new' ? undefined : tableModal?.id, parentId);
    setTableModal(null);
    await revalidateAll();
  };

  const removeTableData = async (tb: DiningTable) => {
    const ok = await confirm({
      title: t('tbl.deleteTitle'),
      confirmLabel: t('form.delete'),
      cancelLabel: t('form.cancel'),
      destructive: true,
    });
    if (!ok) return;
    const deleted = await deleteTable(db, tb.id);
    if (!deleted) {
      notify(t('tbl.deleteTitle'), t('tbl.inUse'));
      return;
    }
    setTableModal(null);
    await revalidateAll();
  };

  // Selected parent object for live preview
  const previewParent = useMemo(
    () => rootTables.find((r) => r.id === tableParentIdInput),
    [rootTables, tableParentIdInput],
  );

  // 1. RENDER DISHES TAB
  const renderItemsTab = () => {
    const q = query.trim().toLowerCase();
    const filtered = items.filter((i) => {
      if (selectedCatId && i.category_id !== selectedCatId) return false;
      if (!q) return true;
      return i.name.toLowerCase().includes(q) || itemName(i.id, i.name).toLowerCase().includes(q);
    });

    return (
      <View style={styles.tabContent}>
        <View style={styles.topActions}>
          <TextField
            icon="search"
            placeholder={t('pos.search')}
            value={query}
            onChangeText={setQuery}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {categories.length > 0 ? (
            <ChipRow>
              <Chip
                label={t('att.all')}
                selected={selectedCatId === null}
                onPress={() => setSelectedCatId(null)}
              />
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  label={categoryName(c.id, c.name)}
                  selected={selectedCatId === c.id}
                  onPress={() => setSelectedCatId(selectedCatId === c.id ? null : c.id)}
                />
              ))}
            </ChipRow>
          ) : null}
          <Button
            label={t('menu.addItem')}
            icon="add"
            variant="primary"
            size="lg"
            onPress={() => openItemModal()}
            fullWidth
          />
        </View>

        {filtered.length === 0 ? (
          <EmptyState icon="restaurant-outline" title={t('pos.noMenu')} />
        ) : (
          filtered.map((item) => {
            const localized = itemName(item.id, item.name);
            const imageSrc = menuImageSource(item.image);
            return (
              <Card key={item.id} style={styles.itemRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Zoom ${localized}`}
                  onPress={() => setZoomedDish(item)}
                  style={styles.dishThumbnailWrap}>
                  {imageSrc ? (
                    <Image
                      source={imageSrc}
                      style={styles.dishThumbnail}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : (
                    <View style={[styles.dishThumbnailPlaceholder, { backgroundColor: colors.surfaceMuted }]}>
                      <Ionicons name="fast-food-outline" size={24} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.vegMarkBadge}>
                    <VegMark veg={item.is_veg === 1} />
                  </View>
                </Pressable>

                <View style={styles.flex}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {localized}
                  </Text>
                  {localized !== item.name ? (
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {item.name}
                    </Text>
                  ) : null}
                  <Text variant="caption" tone="primary" style={{ fontWeight: '700', marginTop: 2 }}>
                    {formatMoney(item.price, settings.currency)}
                  </Text>
                </View>

                <View style={styles.rowTrail}>
                  <Switch
                    value={item.is_available === 1}
                    onValueChange={() => toggleAvailable(item)}
                    trackColor={{ true: colors.primary, false: colors.border }}
                  />
                  <IconButton
                    icon="create-outline"
                    label={t('menu.editItem')}
                    onPress={() => openItemModal(item)}
                  />
                  <IconButton
                    icon="trash-outline"
                    label={t('form.delete')}
                    variant="danger"
                    onPress={() => removeDish(item)}
                  />
                </View>
              </Card>
            );
          })
        )}
      </View>
    );
  };

  // 2. RENDER CATEGORIES TAB
  const renderCategoriesTab = () => (
    <View style={styles.tabContent}>
      <Button
        label={t('menu.addCategory')}
        icon="add"
        variant="primary"
        size="lg"
        onPress={() => openCatModal()}
        fullWidth
      />
      {categories.length === 0 ? (
        <EmptyState
          icon="folder-open-outline"
          title="No Categories Yet"
          body="Add categories like Tiffin, Meals, Snacks, or Drinks to organize your dishes."
        />
      ) : null}
      {categories.map((cat, idx) => {
        const localized = categoryName(cat.id, cat.name);
        return (
          <Card key={cat.id} style={styles.catRow}>
            <View style={styles.flex}>
              <Text variant="heading">{localized}</Text>
              {localized !== cat.name ? (
                <Text variant="caption" tone="muted">
                  {cat.name}
                </Text>
              ) : null}
            </View>
            <View style={styles.reorderButtons}>
              <IconButton
                icon="arrow-up-outline"
                label={t('menu.moveUp')}
                disabled={idx === 0}
                onPress={async () => {
                  await moveCategory(db, cat.id, -1);
                  revalidateAll();
                }}
              />
              <IconButton
                icon="arrow-down-outline"
                label={t('menu.moveDown')}
                disabled={idx === categories.length - 1}
                onPress={async () => {
                  await moveCategory(db, cat.id, 1);
                  revalidateAll();
                }}
              />
              <IconButton
                icon="create-outline"
                label={t('menu.renameCategory')}
                onPress={() => openCatModal(cat)}
              />
              <IconButton
                icon="trash-outline"
                label={t('form.delete')}
                variant="danger"
                onPress={() => removeCat(cat)}
              />
            </View>
          </Card>
        );
      })}
    </View>
  );

  // 3. RENDER TABLES TAB
  const renderTablesTab = () => (
    <View style={styles.tabContent}>
      <Button
        label={t('tbl.add')}
        icon="add"
        variant="primary"
        size="lg"
        onPress={() => openTableModal()}
        fullWidth
      />
      {tables.length === 0 ? (
        <EmptyState
          icon="grid-outline"
          title="No Dining Tables Configured"
          body="Add tables with custom chair counts and optional sub-tables (e.g. T1-A, T1-B)."
        />
      ) : null}
      <View style={styles.grid}>
        {tables.map((tb) => (
          <View key={tb.id} style={styles.tableCol}>
            <Card style={styles.tableCard}>
              <View style={styles.tableCardTop}>
                <TableChairLayout
                  name={tb.name}
                  seats={tb.seats}
                  isSubTable={Boolean(tb.parent_id)}
                  parentName={tb.parent_name}
                  size="md"
                />
              </View>
              <View style={styles.tableCardBottom}>
                <IconButton
                  icon="create-outline"
                  label={t('tbl.edit')}
                  onPress={() => openTableModal(tb)}
                />
                <IconButton
                  icon="trash-outline"
                  label={t('form.delete')}
                  variant="danger"
                  onPress={() => removeTableData(tb)}
                />
              </View>
            </Card>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <Screen>
      <ScreenHeader back title={t('menu.title')} />
      <View style={{ paddingHorizontal: gutter, paddingBottom: 12 }}>
        <Content>
          <Segmented<Tab>
            label={t('menu.title')}
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: 'items', label: t('pos.items', { count: items.length }) },
              { value: 'categories', label: t('tr.categories') },
              { value: 'tables', label: t('ord.tables') },
            ]}
          />
        </Content>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 64 }}>
        <Content>
          {activeTab === 'items'
            ? renderItemsTab()
            : activeTab === 'categories'
              ? renderCategoriesTab()
              : renderTablesTab()}
        </Content>
      </ScrollView>

      {/* DISH CREATION / EDIT MODAL */}
      <Modal
        visible={itemModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setItemModal(null)}
        statusBarTranslucent>
        <SafeAreaView
          edges={['top', 'bottom', 'left', 'right']}
          style={[styles.modalSafeArea, { backgroundColor: colors.overlay }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardWrap}>
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={[styles.modalBox, { backgroundColor: colors.surface }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              <Text variant="heading">
                {itemModal === 'new' ? t('menu.addItem') : t('menu.editItem')}
              </Text>

              {/* Photo Section with Live Preview, Delete, and Retake */}
              <View style={styles.photoSection}>
                <Text variant="label">{t('menu.photo')}</Text>

                {itemImageInput ? (
                  <View style={[styles.photoCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                    <Pressable
                      onPress={() => {
                        if (itemImageInput) {
                          setZoomedDish({
                            id: itemModal === 'new' ? 'preview' : itemModal?.id ?? 'preview',
                            name: itemNameInput || 'Preview',
                            category_id: itemCatIdInput,
                            price: toMinor(itemPriceInput) ?? 0,
                            image: itemImageInput,
                            is_veg: itemVegInput ? 1 : 0,
                            is_available: itemAvailInput ? 1 : 0,
                            sort: 0,
                          });
                        }
                      }}
                      style={styles.photoPreviewWrap}>
                      <Image
                        key={itemImageInput}
                        source={menuImageSource(itemImageInput)}
                        style={styles.photoPreview}
                        contentFit="contain"
                        priority="high"
                        cachePolicy="none"
                      />
                    </Pressable>
                    <View style={styles.photoActionsRow}>
                      <Button
                        size="sm"
                        label="Delete"
                        icon="trash-outline"
                        variant="danger"
                        onPress={() => setItemImageInput(null)}
                      />
                      <Button
                        size="sm"
                        label="Camera"
                        icon="camera-outline"
                        variant="secondary"
                        onPress={handleTakeDishPhoto}
                      />
                      <Button
                        size="sm"
                        label="Upload"
                        icon="cloud-upload-outline"
                        variant="secondary"
                        onPress={handlePickDishPhoto}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={[styles.photoPlaceholder, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                    <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
                    <Text variant="caption" tone="muted">
                      No picture added yet
                    </Text>
                    <View style={styles.photoButtonsRow}>
                      <Button
                        size="sm"
                        label="Camera"
                        icon="camera-outline"
                        variant="secondary"
                        onPress={handleTakeDishPhoto}
                      />
                      <Button
                        size="sm"
                        label="Upload"
                        icon="cloud-upload-outline"
                        variant="secondary"
                        onPress={handlePickDishPhoto}
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Dish Names: English + Localized */}
              <View style={styles.modalFieldGroup}>
                <TextField
                  label={t('menu.itemName')}
                  value={itemNameInput}
                  onChangeText={handleDishNameChange}
                  autoCapitalize="words"
                  error={
                    exactDuplicate
                      ? `"${exactDuplicate.name}" already exists (${formatMoney(exactDuplicate.price, settings.currency)})`
                      : null
                  }
                />

                {exactDuplicate ? (
                  <View
                    style={[
                      styles.duplicateBanner,
                      { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
                    ]}>
                    <View style={styles.duplicateBannerHeader}>
                      <Ionicons name="alert-circle" size={18} color={colors.danger} />
                      <Text variant="caption" tone="danger" style={{ fontWeight: '700', flex: 1 }}>
                        {t('menu.nameTaken')}
                      </Text>
                    </View>
                    <Text variant="caption" tone="danger">
                      {t('menu.nameTakenBody', {
                        name: exactDuplicate.name,
                        price: formatMoney(exactDuplicate.price, settings.currency),
                      })}
                    </Text>
                    <View style={{ paddingTop: 4 }}>
                      <Button
                        size="sm"
                        label={t('menu.editExisting')}
                        icon="create-outline"
                        variant="danger"
                        onPress={() => openItemModal(exactDuplicate)}
                      />
                    </View>
                  </View>
                ) : null}

                {matchedDishes.length > 0 ? (
                  <View style={styles.matchedSuggestionsBox}>
                    <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
                      {t('menu.similarMatches')}
                    </Text>
                    <View style={styles.matchedChipsRow}>
                      {matchedDishes.map((m) => (
                        <Pressable
                          key={m.id}
                          onPress={() => openItemModal(m)}
                          style={[
                            styles.matchedChip,
                            { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                          ]}>
                          <Text variant="caption" style={{ fontWeight: '600' }}>
                            {m.name}
                          </Text>
                          <Text variant="caption" tone="primary" style={{ fontWeight: '700' }}>
                            {formatMoney(m.price, settings.currency)}
                          </Text>
                          <Ionicons name="create-outline" size={12} color={colors.textMuted} />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>

              {!isEnglish ? (
                <View style={styles.modalFieldGroup}>
                  <TextField
                    label={`${t('form.localName', { language: currentLang.nativeName })} (Auto-converted)`}
                    value={itemLocalNameInput}
                    onChangeText={setItemLocalNameInput}
                    autoCapitalize="words"
                  />
                  <Text variant="caption" tone="muted">
                    Auto-transliterated into {currentLang.nativeName}. You can edit it if needed.
                  </Text>
                </View>
              ) : null}

              <TextField
                label={t('menu.price')}
                prefix={settings.currency}
                value={itemPriceInput}
                onChangeText={(v) => setItemPriceInput(v.replace(/[^\d.]/g, ''))}
                keyboardType="decimal-pad"
              />

              <View style={styles.modalFieldGroup}>
                <Text variant="label">{t('menu.category')}</Text>
                <ChipRow wrap>
                  {categories.map((c) => (
                    <Chip
                      key={c.id}
                      label={categoryName(c.id, c.name)}
                      selected={itemCatIdInput === c.id}
                      onPress={() => setItemCatIdInput(c.id)}
                    />
                  ))}
                </ChipRow>
              </View>

              <View style={styles.switchRow}>
                <Text variant="bodyStrong">{t('pos.veg')}</Text>
                <Switch
                  value={itemVegInput}
                  onValueChange={setItemVegInput}
                  trackColor={{ true: colors.primary, false: colors.border }}
                />
              </View>

              <View style={styles.switchRow}>
                <Text variant="bodyStrong">{t('menu.available')}</Text>
                <Switch
                  value={itemAvailInput}
                  onValueChange={setItemAvailInput}
                  trackColor={{ true: colors.primary, false: colors.border }}
                />
              </View>

              <View style={styles.modalActions}>
                <Button label={t('form.save')} variant="primary" size="lg" onPress={saveDish} />
                {itemModal && itemModal !== 'new' ? (
                  <Button
                    label={t('form.delete')}
                    variant="danger"
                    size="lg"
                    onPress={() => removeDish(itemModal)}
                  />
                ) : null}
                <Button
                  label={t('form.cancel')}
                  variant="ghost"
                  size="lg"
                  onPress={() => setItemModal(null)}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* CATEGORY MODAL */}
      <Modal
        visible={catModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCatModal(null)}
        statusBarTranslucent>
        <SafeAreaView
          edges={['top', 'bottom', 'left', 'right']}
          style={[styles.modalSafeArea, { backgroundColor: colors.overlay }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardWrap}>
            <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
              <Text variant="heading">
                {catModal === 'new' ? t('menu.addCategory') : t('menu.renameCategory')}
              </Text>
              <TextField
                label={t('menu.categoryName')}
                value={catNameInput}
                onChangeText={handleCatNameChange}
                autoCapitalize="words"
              />
              {!isEnglish ? (
                <View style={styles.modalFieldGroup}>
                  <TextField
                    label={`${t('form.localName', { language: currentLang.nativeName })} (Auto-converted)`}
                    value={catLocalNameInput}
                    onChangeText={setCatLocalNameInput}
                    autoCapitalize="words"
                  />
                  <Text variant="caption" tone="muted">
                    Auto-transliterated into {currentLang.nativeName}. You can edit it if needed.
                  </Text>
                </View>
              ) : null}
              <View style={styles.modalActions}>
                <Button label={t('form.save')} variant="primary" size="lg" onPress={saveCat} />
                <Button
                  label={t('form.cancel')}
                  variant="ghost"
                  size="lg"
                  onPress={() => setCatModal(null)}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* TABLE CONFIGURATION MODAL WITH CHAIR LAYOUT & SUB-TABLE */}
      <Modal
        visible={tableModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTableModal(null)}
        statusBarTranslucent>
        <SafeAreaView
          edges={['top', 'bottom', 'left', 'right']}
          style={[styles.modalSafeArea, { backgroundColor: colors.overlay }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardWrap}>
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={[styles.modalBox, { backgroundColor: colors.surface }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              <Text variant="heading">
                {tableModal === 'new' ? t('tbl.add') : t('tbl.edit')}
              </Text>

              {/* LIVE CHAIR LAYOUT PREVIEW */}
              <View style={[styles.previewBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <Text variant="caption" tone="muted" style={{ marginBottom: 8, fontWeight: '700' }}>
                  LIVE CHAIR LAYOUT PREVIEW
                </Text>
                <TableChairLayout
                  name={tableNameInput || 'Table'}
                  seats={parseInt(tableSeatsInput, 10) || 4}
                  isSubTable={tableIsSubInput}
                  parentName={previewParent?.name}
                  size="lg"
                />
              </View>

              <TextField
                label={t('tbl.name')}
                placeholder="e.g. T1 or T1-A"
                value={tableNameInput}
                onChangeText={setTableNameInput}
                autoCapitalize="characters"
              />

              {/* Sub-table Switch */}
              <View style={styles.switchRow}>
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{t('tbl.subTable')}</Text>
                  <Text variant="caption" tone="muted">
                    Link as a sub-table under an existing table
                  </Text>
                </View>
                <Switch
                  value={tableIsSubInput}
                  onValueChange={handleSubTableToggle}
                  trackColor={{ true: colors.primary, false: colors.border }}
                />
              </View>

              {/* Parent Table Selection if Sub-table is enabled */}
              {tableIsSubInput ? (
                <View style={styles.modalFieldGroup}>
                  <Text variant="label">{t('tbl.parentTable')}</Text>
                  <ChipRow wrap>
                    {rootTables.map((parent) => (
                      <Chip
                        key={parent.id}
                        label={parent.name}
                        selected={tableParentIdInput === parent.id}
                        onPress={() => handleParentSelect(parent.id)}
                      />
                    ))}
                  </ChipRow>
                </View>
              ) : null}

              {/* Number of Chairs / Seats Layout */}
              <View style={styles.modalFieldGroup}>
                <Text variant="label">{t('tbl.chairLayout')} ({tableSeatsInput} chairs)</Text>
                <View style={styles.stepperRow}>
                  <IconButton
                    icon="remove"
                    label="Decrease seats"
                    variant="secondary"
                    onPress={() => adjustSeats(-1)}
                  />
                  <TextField
                    value={tableSeatsInput}
                    onChangeText={(v) => setTableSeatsInput(v.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    style={{ textAlign: 'center', minWidth: 60 }}
                  />
                  <IconButton
                    icon="add"
                    label="Increase seats"
                    variant="secondary"
                    onPress={() => adjustSeats(1)}
                  />
                </View>

                {/* Quick seat presets */}
                <ChipRow wrap>
                  {SEAT_PRESETS.map((count) => (
                    <Chip
                      key={count}
                      label={`${count} chairs`}
                      selected={parseInt(tableSeatsInput, 10) === count}
                      onPress={() => setTableSeatsInput(String(count))}
                    />
                  ))}
                </ChipRow>
              </View>

              <View style={styles.modalActions}>
                <Button label={t('form.save')} variant="primary" size="lg" onPress={saveTableData} />
                <Button
                  label={t('form.cancel')}
                  variant="ghost"
                  size="lg"
                  onPress={() => setTableModal(null)}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <DishZoomModal
        item={zoomedDish}
        onClose={() => setZoomedDish(null)}
        showQuantity={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  tabContent: { gap: 12 },
  topActions: { gap: 10, paddingBottom: 8 },
  itemRow: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dishThumbnailWrap: {
    width: 54,
    height: 54,
    borderRadius: radius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  dishThumbnail: {
    width: '100%',
    height: '100%',
  },
  dishThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegMarkBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: '#ffffffdd',
    borderRadius: 2,
    padding: 1,
  },
  rowTrail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catRow: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reorderButtons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  tableCol: { width: '50%', padding: 4 },
  tableCard: {
    padding: 12,
    gap: 12,
    alignItems: 'center',
  },
  tableCardTop: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  tableCardBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  modalSafeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  modalKeyboardWrap: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '100%',
    justifyContent: 'center',
  },
  modalScrollView: {
    width: '100%',
    maxHeight: '100%',
  },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalBox: { width: '100%', padding: 20, borderRadius: radius.lg, gap: 14 },
  modalFieldGroup: { gap: 6 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  previewBox: {
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSection: {
    gap: 8,
    width: '100%',
  },
  photoCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  photoPreviewWrap: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#00000014',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 200,
  },
  photoActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  photoPlaceholder: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  photoButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 4,
  },
  modalActions: { gap: 8, paddingTop: 8 },
  duplicateBanner: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  duplicateBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchedSuggestionsBox: {
    gap: 6,
    paddingTop: 4,
  },
  matchedChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  matchedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
