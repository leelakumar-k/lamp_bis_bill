import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState, Segmented } from '@/components/ui/primitives';
import { Content, Screen, ScreenHeader } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { categoryKey, itemKey, professionKey, workerKey } from '@/db/translations';
import { listCategories, listItems } from '@/db/menu';
import { fullName, listProfessions, listWorkers } from '@/db/workers';
import { useResponsive } from '@/hooks/use-responsive';
import { type StringKey, useI18n } from '@/i18n';
import { builtInProfession, PROFESSIONS } from '@/i18n/professions';
import { en } from '@/i18n/strings/en';
import { useDbQuery } from '@/providers/database';
import { radius, useTheme } from '@/theme';

type Kind = 'app' | 'professions' | 'names' | 'items' | 'categories';
type Entry = { key: string; english: string; current: string | undefined; edited: boolean };

export default function TranslationsScreen() {
  const { t, lang, language, overrides, builtIn } = useI18n();
  const { colors } = useTheme();
  const { gutter } = useResponsive();
  const [kind, setKind] = useState<Kind>('app');
  const [query, setQuery] = useState('');
  const { data: workers = [] } = useDbQuery('workers', (db) => listWorkers(db));
  const { data: dbProfessions = [] } = useDbQuery('professions', listProfessions);
  const { data: items = [] } = useDbQuery('items', listItems);
  const { data: categories = [] } = useDbQuery('categories', listCategories);

  const entries = useMemo<Entry[]>(() => {
    if (kind === 'app') {
      return (Object.keys(en) as StringKey[]).map((key) => ({
        key,
        english: en[key],
        current: overrides[key] ?? builtIn(key),
        edited: key in overrides,
      }));
    }
    if (kind === 'professions') {
      return [...new Set([...PROFESSIONS, ...dbProfessions])].map((p) => {
        const key = professionKey(p);
        return { key, english: p, current: overrides[key] ?? builtInProfession(lang, p), edited: key in overrides };
      });
    }
    if (kind === 'items') {
      return items.map((i) => {
        const key = itemKey(i.id);
        return { key, english: i.name, current: overrides[key], edited: key in overrides };
      });
    }
    if (kind === 'categories') {
      return categories.map((c) => {
        const key = categoryKey(c.id);
        return { key, english: c.name, current: overrides[key], edited: key in overrides };
      });
    }
    return workers.map((w) => {
      const key = workerKey(w.id);
      return { key, english: fullName(w), current: overrides[key], edited: key in overrides };
    });
  }, [kind, overrides, builtIn, dbProfessions, workers, items, categories, lang]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => `${e.english} ${e.current ?? ''}`.toLowerCase().includes(q));
  }, [entries, query]);

  if (lang === 'en') {
    return (
      <Screen>
        <ScreenHeader back title={t('tr.title')} />
        <EmptyState icon="language-outline" title={t('tr.title')} body={en['tr.englishOnly']}>
          <Button label={t('set.language')} icon="language-outline" onPress={() => router.replace('/language')} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader back title={t('tr.title')} subtitle={`${t('tr.english')} → ${language.nativeName}`} />
      <View style={{ paddingHorizontal: gutter }}>
        <Content style={styles.filters}>
          <Segmented<Kind>
            label={t('tr.title')}
            value={kind}
            onChange={setKind}
            options={[
              { value: 'app', label: t('tr.appText') },
              { value: 'professions', label: t('tr.professions') },
              { value: 'names', label: t('tr.names') },
              { value: 'items', label: t('tr.items') },
              { value: 'categories', label: t('tr.categories') },
            ]}
          />
          <TextField
            icon="search"
            placeholder={t('tr.search')}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </Content>
      </View>
      <FlashList
        data={visible}
        keyExtractor={(e) => e.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<EmptyState icon="search" title={t('att.noResults')} />}
        renderItem={({ item }) => (
          <Content>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.english}: ${item.current ?? t('tr.missing')}`}
              onPress={() =>
                router.push({ pathname: '/translations/edit', params: { key: item.key, english: item.english } })
              }
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: pressed ? colors.surfaceMuted : colors.surface, borderColor: colors.border },
              ]}>
              <View style={styles.flex}>
                <Text variant="caption" tone="muted" numberOfLines={2}>
                  {item.english}
                </Text>
                <Text variant="bodyStrong" tone={item.current ? 'default' : 'muted'} numberOfLines={3}>
                  {item.current ?? t('tr.missing')}
                </Text>
              </View>
              {item.edited ? (
                <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
                  <Text variant="caption" tone="accent">
                    {t('tr.edited')}
                  </Text>
                </View>
              ) : null}
              <Ionicons name="create-outline" size={18} color={colors.textMuted} />
            </Pressable>
          </Content>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { gap: 10, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1 },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
});
