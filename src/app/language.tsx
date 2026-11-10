import { Ionicons } from '@expo/vector-icons';
import { goBack } from '@/lib/navigation';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSWRConfig } from 'swr';

import { Card } from '@/components/ui/primitives';
import { Content, Screen, ScreenHeader } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { setSetting } from '@/db/meta';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/i18n';
import { LANGUAGES } from '@/i18n/languages';
import { useDb, useSettings } from '@/providers/database';
import { useTheme } from '@/theme';

export default function LanguageScreen() {
  const db = useDb();
  const settings = useSettings();
  const { mutate } = useSWRConfig();
  const { t } = useI18n();
  const { colors } = useTheme();
  const { gutter, gridColumns } = useResponsive();

  const choose = async (code: string) => {
    await mutate('settings', { ...settings, language: code }, { revalidate: false });
    await setSetting(db, 'language', code);
    goBack('/settings');
  };

  return (
    <Screen>
      <ScreenHeader back title={t('set.language')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 32 }}>
        <Content>
          <View accessibilityRole="radiogroup" style={styles.grid}>
            {LANGUAGES.map((lang) => {
              const selected = settings.language === lang.code;
              return (
                <View key={lang.code} style={{ width: `${100 / Math.min(gridColumns, 2)}%`, padding: 4 }}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${lang.nativeName}, ${lang.englishName}`}
                    onPress={() => choose(lang.code)}>
                    {({ pressed }) => (
                      <Card
                        style={[
                          styles.option,
                          { opacity: pressed ? 0.8 : 1 },
                          selected ? { borderColor: colors.primary, borderWidth: 2 } : {},
                        ]}>
                        <View style={styles.flex}>
                          <Text variant="heading">{lang.nativeName}</Text>
                          <Text variant="caption" tone="muted">
                            {lang.englishName}
                          </Text>
                        </View>
                        <Ionicons
                          name={selected ? 'radio-button-on' : 'radio-button-off'}
                          size={22}
                          color={selected ? colors.primary : colors.textMuted}
                        />
                      </Card>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </Content>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, minHeight: 72 },
  flex: { flex: 1 },
});
