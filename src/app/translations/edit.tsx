import { useLocalSearchParams } from 'expo-router';

import { goBack } from '@/lib/navigation';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FormScrollView } from '@/components/keyboard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/primitives';
import { Content, Screen, ScreenHeader } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { deleteOverride, setOverride } from '@/db/translations';
import { useResponsive } from '@/hooks/use-responsive';
import { type StringKey, useI18n } from '@/i18n';
import { builtInProfession } from '@/i18n/professions';
import { useDb, useRevalidateAll } from '@/providers/database';

function defaultFor(key: string, lang: string, builtIn: (k: StringKey) => string | undefined) {
  if (key.startsWith('profession:')) return builtInProfession(lang, key.slice('profession:'.length));
  if (key.startsWith('worker:') || key.startsWith('item:') || key.startsWith('category:')) return undefined;
  return builtIn(key as StringKey);
}

export default function EditTranslationScreen() {
  const { key, english } = useLocalSearchParams<{ key: string; english: string }>();
  const db = useDb();
  const revalidateAll = useRevalidateAll();
  const { t, lang, overrides, builtIn } = useI18n();
  const { gutter } = useResponsive();
  const fallback = defaultFor(key, lang, builtIn);
  const edited = key in overrides;
  const [value, setValue] = useState(overrides[key] ?? fallback ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const trimmed = value.trim();
      if (!trimmed || trimmed === fallback) await deleteOverride(db, lang, key);
      else await setOverride(db, lang, key, trimmed);
      await revalidateAll();
      goBack('/translations');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    await deleteOverride(db, lang, key);
    await revalidateAll();
    goBack('/translations');
  };

  const isName = key.startsWith('worker:') || key.startsWith('item:') || key.startsWith('category:');

  return (
    <Screen>
      <ScreenHeader back title={t('tr.title')} />
      <FormScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 32 }}>
        <Content style={styles.form}>
          <Card style={styles.source}>
            <Text variant="caption" tone="muted">
              {t('tr.english')}
            </Text>
            <Text variant="heading" selectable>
              {english}
            </Text>
          </Card>
          <TextField
            label={t('tr.translation')}
            value={value}
            onChangeText={setValue}
            placeholder={fallback ?? english}
            multiline={!isName && (english?.length ?? 0) > 40}
            autoFocus
            hint={isName || key.startsWith('profession:') ? t('tr.typingTip') : undefined}
            returnKeyType="done"
            onSubmitEditing={save}
          />
          {key.includes('{') || english?.includes('{') ? (
            <Text variant="caption" tone="muted">
              {'{…}'}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button label={t('form.save')} icon="checkmark" size="lg" onPress={save} loading={saving} fullWidth />
            {edited ? (
              <Button label={t('tr.reset')} icon="refresh" variant="secondary" onPress={reset} fullWidth />
            ) : null}
          </View>
        </Content>
      </FormScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18, maxWidth: 640 },
  source: { padding: 16, gap: 4 },
  actions: { gap: 10 },
});
