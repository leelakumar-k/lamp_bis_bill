import { useLocalSearchParams } from 'expo-router';

import { goBack } from '@/lib/navigation';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FormScrollView } from '@/components/keyboard';
import { PeriodStepper } from '@/components/period-stepper';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/primitives';
import { Content, Screen, ScreenHeader } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { addPayment } from '@/db/payments';
import type { PaymentType } from '@/db/types';
import { getWorker } from '@/db/workers';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/i18n';
import { addDays, formatDay, formatWeekday, relativeDay, today } from '@/lib/date';
import { successFeedback } from '@/lib/haptics';
import { toMinor } from '@/lib/money';
import { useDb, useDbQuery, useRevalidateAll, useSettings } from '@/providers/database';

export default function AddPaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const revalidateAll = useRevalidateAll();
  const { t, locale, workerName } = useI18n();
  const { currency } = useSettings();
  const { gutter } = useResponsive();
  const { data: worker } = useDbQuery(['worker', id], (d) => getWorker(d, id));

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<PaymentType>('advance');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const relative = relativeDay(date);

  const save = async () => {
    const minor = toMinor(amount);
    if (minor === null || minor <= 0) {
      setError(t('form.invalidAmount'));
      return;
    }
    setSaving(true);
    try {
      await addPayment(db, { worker_id: id, amount: minor, type, paid_on: date, note: note.trim() || null });
      successFeedback();
      await revalidateAll();
      goBack(`/worker/${id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader back title={t('pay.title')} subtitle={worker ? workerName(worker.id, worker) : undefined} />
      <FormScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 32 }}>
        <Content style={styles.form}>
          <TextField
            label={t('pay.amount')}
            prefix={currency}
            value={amount}
            onChangeText={(v) => {
              setAmount(v.replace(/[^\d.]/g, ''));
              setError(null);
            }}
            error={error}
            keyboardType="decimal-pad"
            autoFocus
            style={styles.amount}
          />
          <View style={styles.group}>
            <Text variant="label">{t('pay.type')}</Text>
            <Segmented
              label={t('pay.type')}
              value={type}
              onChange={setType}
              options={[
                { value: 'advance', label: t('pay.advance') },
                { value: 'settlement', label: t('pay.settlement') },
              ]}
            />
          </View>
          <View style={styles.group}>
            <Text variant="label">{t('pay.date')}</Text>
            <PeriodStepper
              compact
              title={relative ? t(`day.${relative}`) : formatWeekday(date, locale)}
              subtitle={formatDay(date, locale)}
              previousLabel={t('day.previous')}
              nextLabel={t('day.next')}
              onPrevious={() => setDate(addDays(date, -1))}
              onNext={() => setDate(addDays(date, 1))}
              nextDisabled={date >= today()}
              onReset={relative === 'today' ? undefined : () => setDate(today())}
            />
          </View>
          <TextField
            label={t('pay.note')}
            placeholder={t('form.optional')}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={200}
          />
          <Button label={t('form.save')} icon="checkmark" size="lg" onPress={save} loading={saving} fullWidth />
        </Content>
      </FormScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18, maxWidth: 560 },
  group: { gap: 8 },
  amount: { fontSize: 24, fontWeight: '700' },
});
