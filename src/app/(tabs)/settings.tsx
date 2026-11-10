import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSWRConfig } from 'swr';

import { FormScrollView } from '@/components/keyboard';
import { useToast } from '@/components/toast';
import { Card, Chip, ChipRow, ListRow, SectionTitle, Segmented } from '@/components/ui/primitives';
import { Content, Screen, ScreenHeader } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { type PaperWidth, type ReceiptLanguage, setSetting, type Settings, type ThemePreference } from '@/db/meta';
import { loadSampleRestaurant } from '@/db/pos-seed';
import { loadSampleData } from '@/db/seed';
import { createBackup, deleteAllData, importLegacyAttendance, parseBackup, restoreBackup } from '@/db/transfer';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/i18n';
import { confirm, notify } from '@/lib/confirm';
import { nowLocal, today } from '@/lib/date';
import { pickTextFile, shareFile } from '@/lib/file-io';
import { printReceipt } from '@/lib/print';
import { buildOrderReceipt } from '@/lib/receipt';
import { useDb, useRevalidateAll, useSettings } from '@/providers/database';
import { usePrinter } from '@/providers/printer-context';

const CURRENCIES = ['₹', '$', '€', '£', 'AED '];

export default function SettingsScreen() {
  const db = useDb();
  const settings = useSettings();
  const { mutate } = useSWRConfig();
  const revalidateAll = useRevalidateAll();
  const toast = useToast();
  const { t, language } = useI18n();
  const { gutter } = useResponsive();
  const { printBill, openPrinterPicker, selectedPrinter } = usePrinter();

  const [businessName, setBusinessName] = useState(settings.businessName);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [gstin, setGstin] = useState(settings.gstin);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter);
  const [taxPercent, setTaxPercent] = useState(settings.taxPercent);
  const [dayStartHour, setDayStartHour] = useState(settings.dayStartHour);

  const update = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    await mutate('settings', { ...settings, [key]: value }, { revalidate: false });
    await setSetting(db, key, value);
    mutate('settings');
  };

  const guarded = (task: () => Promise<void>) => async () => {
    try {
      await task();
    } catch (error) {
      notify(t('set.error'), error instanceof Error ? error.message : undefined);
    }
  };

  const backup = guarded(async () => {
    const data = await createBackup(db);
    await shareFile(`muster-backup-${today()}.json`, 'application/json', JSON.stringify(data, null, 2));
  });

  const restore = guarded(async () => {
    const text = await pickTextFile(['application/json', 'text/plain', '*/*']);
    if (!text) return;
    const data = parseBackup(text);
    const ok = await confirm({
      title: t('set.restore'),
      message: t('set.restoreBody'),
      confirmLabel: t('common.confirm'),
      cancelLabel: t('form.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await restoreBackup(db, data);
    await revalidateAll();
    toast({ message: t('set.restored') });
  });

  const importLegacy = guarded(async () => {
    const text = await pickTextFile(['text/plain', 'text/csv', '*/*']);
    if (!text) return;
    const result = await importLegacyAttendance(db, text);
    await revalidateAll();
    toast({ message: t('set.importDone', result) });
  });

  const reset = guarded(async () => {
    const ok = await confirm({
      title: t('set.reset'),
      message: t('set.resetBody'),
      confirmLabel: t('form.delete'),
      cancelLabel: t('form.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await deleteAllData(db);
    await revalidateAll();
  });

  const testPrint = guarded(async () => {
    const sample = buildOrderReceipt(
      {
        id: 'test',
        shift_id: 'test',
        business_date: today(),
        type: 'dine_in',
        table_id: null,
        party: 'A',
        token: null,
        bill_no: 1,
        status: 'billed',
        customer_name: 'Sample Guest',
        note: null,
        tax_percent: settings.gstin?.trim() ? Number(settings.taxPercent) || 5 : 0,
        subtotal: 40000,
        discount: 0,
        tax: settings.gstin?.trim() ? 2000 : 0,
        round_off: 0,
        total: settings.gstin?.trim() ? 42000 : 40000,
        payment_mode: null,
        revision: 0,
        created_at: nowLocal(),
        updated_at: nowLocal(),
        billed_at: nowLocal(),
        paid_at: null,
        table_name: 'T1',
        item_count: 2,
        shift_name: 'Shift 1',
        lines: [
          { item_id: null, category_id: null, name: 'Paneer Tikka', category_name: 'Starters', price: 28000, qty: 1, note: null },
          { item_id: null, category_id: null, name: 'Butter Naan', category_name: 'Breads', price: 6000, qty: 2, note: null },
        ],
      },
      {
        settings: {
          ...settings,
          businessName: settings.businessName?.trim() || 'My Restaurant',
          address: settings.address?.trim() || '123 Market Street, City',
          phone: settings.phone?.trim() || '9876543210',
        },
        kind: 'bill',
        itemName: (_, n) => n,
      },
    );
    await printBill(sample);
  });

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScreenHeader title={t('tab.settings')} />
      <FormScrollView toolbar={false} contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 96 }}>
        <Content style={styles.body}>
          {/* GENERAL */}
          <View>
            <SectionTitle>{t('set.general')}</SectionTitle>
            <Card>
              <ListRow
                icon="shield-checkmark-outline"
                title="Account & Subscription Plan"
                subtitle={`${(settings.plan || 'super').toUpperCase()} · ${settings.customerId || 'Register'}`}
                onPress={() => router.push('/account')}
              />
              <ListRow
                icon="restaurant-outline"
                title={t('set.menu')}
                subtitle={t('menu.title')}
                onPress={() => router.push('/menu')}
              />
              <ListRow
                icon="language-outline"
                title={t('set.language')}
                value={language.nativeName}
                onPress={() => router.push('/language')}
              />
              <ListRow
                icon="create-outline"
                title={t('set.translations')}
                subtitle={t('set.translationsHint')}
                onPress={() => router.push('/translations')}
                last
              />
            </Card>
          </View>

          {/* APPEARANCE */}
          <View style={styles.group}>
            <SectionTitle>{t('set.appearance')}</SectionTitle>
            <Segmented<ThemePreference>
              label={t('set.appearance')}
              value={settings.theme}
              onChange={(v) => update('theme', v)}
              options={[
                { value: 'system', label: t('set.system') },
                { value: 'light', label: t('set.light') },
                { value: 'dark', label: t('set.dark') },
              ]}
            />
          </View>

          {/* RESTAURANT DETAILS */}
          <View>
            <SectionTitle>{t('set.restaurant')}</SectionTitle>
            <Card style={styles.fields}>
              <TextField
                label={t('set.business')}
                placeholder="Muster"
                value={businessName}
                onChangeText={setBusinessName}
                onEndEditing={() => update('businessName', businessName.trim())}
                returnKeyType="next"
              />
              <View style={styles.group}>
                <Text variant="label">{t('set.currency')}</Text>
                <ChipRow wrap>
                  {CURRENCIES.map((c) => (
                    <Chip key={c} label={c.trim()} selected={settings.currency === c} onPress={() => update('currency', c)} />
                  ))}
                </ChipRow>
              </View>
              <TextField
                label={t('prn.address')}
                placeholder="123 Main Street"
                value={address}
                onChangeText={setAddress}
                onEndEditing={() => update('address', address.trim())}
                returnKeyType="next"
              />
              <TextField
                label={t('prn.phone')}
                placeholder="+91 98765 43210"
                value={phone}
                onChangeText={setPhone}
                onEndEditing={() => update('phone', phone.trim())}
                keyboardType="phone-pad"
                returnKeyType="next"
              />
              <TextField
                label={t('prn.gstin')}
                placeholder="27AAAAA0000A1Z5"
                value={gstin}
                onChangeText={setGstin}
                onEndEditing={() => update('gstin', gstin.trim())}
                autoCapitalize="characters"
                returnKeyType="next"
              />
              <TextField
                label={t('prn.footer')}
                value={receiptFooter}
                onChangeText={setReceiptFooter}
                onEndEditing={() => update('receiptFooter', receiptFooter.trim())}
                returnKeyType="next"
              />
              <TextField
                label={t('prn.tax')}
                value={taxPercent}
                onChangeText={(v) => setTaxPercent(v.replace(/[^\d.]/g, ''))}
                onEndEditing={() => update('taxPercent', taxPercent.trim() || '0')}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
              <TextField
                label={t('prn.dayStart')}
                hint={t('prn.dayStartHint')}
                value={dayStartHour}
                onChangeText={(v) => setDayStartHour(v.replace(/\D/g, ''))}
                onEndEditing={() => {
                  const h = Math.min(23, Math.max(0, parseInt(dayStartHour, 10) || 6));
                  setDayStartHour(String(h));
                  update('dayStartHour', String(h));
                }}
                keyboardType="number-pad"
                returnKeyType="done"
              />
            </Card>
          </View>

          {/* PRINTER & BILL SETTINGS */}
          <View>
            <SectionTitle>{t('set.printer')}</SectionTitle>
            <Card style={styles.fields}>
              <View style={styles.group}>
                <Text variant="label">{t('prn.paper')}</Text>
                <Segmented<PaperWidth>
                  label={t('prn.paper')}
                  value={settings.paperWidth}
                  onChange={(v) => update('paperWidth', v)}
                  options={[
                    { value: '58', label: t('prn.paper58') },
                    { value: '80', label: t('prn.paper80') },
                  ]}
                />
              </View>
              <View style={styles.group}>
                <Text variant="label">{t('prn.receiptLang')}</Text>
                <Segmented<ReceiptLanguage>
                  label={t('prn.receiptLang')}
                  value={settings.receiptLanguage}
                  onChange={(v) => update('receiptLanguage', v)}
                  options={[
                    { value: 'en', label: t('prn.receiptEnglish') },
                    { value: 'app', label: t('prn.receiptApp') },
                  ]}
                />
              </View>
              <ListRow
                icon="bluetooth-outline"
                title="Bluetooth Printer"
                subtitle={
                  selectedPrinter
                    ? `${selectedPrinter.name} (${selectedPrinter.address})`
                    : 'Tap to pair / select printer'
                }
                onPress={() => openPrinterPicker()}
              />
              <ListRow
                icon="print-outline"
                title={t('prn.testPrint')}
                onPress={testPrint}
                last
              />
            </Card>
          </View>

          {/* DATA MANAGEMENT */}
          <View>
            <SectionTitle>{t('set.data')}</SectionTitle>
            <Card>
              <ListRow icon="cloud-upload-outline" title={t('set.backup')} onPress={backup} />
              <ListRow icon="cloud-download-outline" title={t('set.restore')} onPress={restore} />
              <ListRow icon="document-text-outline" title={t('set.importLegacy')} onPress={importLegacy} />
              <ListRow
                icon="sparkles-outline"
                title={t('set.sample')}
                onPress={guarded(async () => {
                  await loadSampleData(db);
                  await loadSampleRestaurant(db);
                  await revalidateAll();
                })}
              />
              <ListRow icon="trash-outline" title={t('set.reset')} destructive onPress={reset} last />
            </Card>
          </View>

          <Text variant="caption" tone="muted" align="center">
            Muster · {t('set.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
          </Text>
        </Content>
      </FormScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: 20, maxWidth: 680 },
  group: { gap: 8 },
  fields: { padding: 16, gap: 16 },
});