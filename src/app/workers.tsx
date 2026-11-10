import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip, ChipRow, EmptyState } from '@/components/ui/primitives';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { WorkerRow } from '@/components/workers/worker-row';
import { listWorkers } from '@/db/workers';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/i18n';
import { useDbQuery } from '@/providers/database';

export default function WorkersScreen() {
  const { t, workerName, profession } = useI18n();
  const { gridColumns, gutter } = useResponsive();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string | null>(null);
  const { data: workers = [], isLoading } = useDbQuery('workers', (db) => listWorkers(db));

  const professions = useMemo(() => [...new Set(workers.map((w) => w.profession))].sort(), [workers]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workers.filter((w) => {
      if (filter && w.profession !== filter) return false;
      if (!q) return true;
      return [w.first_name, w.last_name ?? '', w.mobile ?? '', workerName(w.id, w), profession(w.profession)]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [workers, query, filter, workerName, profession]);

  const activeCount = workers.filter((w) => w.is_active === 1).length;

  return (
    <Screen>
      <ScreenHeader
        back
        title={t('tab.workers')}
        subtitle={workers.length ? t('workers.count', { count: activeCount }) : undefined}
        right={<Button label={t('workers.add')} icon="add" onPress={() => router.push('/worker/new')} />}
      />
      {workers.length > 0 ? (
        <View style={[styles.filters, { paddingHorizontal: gutter }]}>
          <TextField
            icon="search"
            placeholder={t('workers.search')}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {professions.length > 1 ? (
            <ChipRow>
              <Chip label={t('att.all')} selected={filter === null} onPress={() => setFilter(null)} />
              {professions.map((p) => (
                <Chip
                  key={p}
                  label={profession(p)}
                  selected={filter === p}
                  onPress={() => setFilter(filter === p ? null : p)}
                />
              ))}
            </ChipRow>
          ) : null}
        </View>
      ) : null}
      <FlashList
        key={gridColumns}
        data={visible}
        numColumns={gridColumns}
        keyExtractor={(w) => w.id}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <WorkerRow worker={item} />
          </View>
        )}
        ListEmptyComponent={
          isLoading ? null : workers.length === 0 ? (
            <EmptyState icon="people-outline" title={t('att.emptyTitle')} body={t('att.emptyBody')}>
              <Button label={t('workers.add')} icon="person-add-outline" onPress={() => router.push('/worker/new')} />
            </EmptyState>
          ) : (
            <EmptyState icon="search" title={t('att.noResults')} />
          )
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: gutter - 4, paddingBottom: 96 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { gap: 10, paddingBottom: 12 },
  cell: { flex: 1, padding: 4 },
});
