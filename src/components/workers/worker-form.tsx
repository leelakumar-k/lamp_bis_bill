import { useRef, useState } from 'react';
import { StyleSheet, Switch, type TextInputInstance, View } from 'react-native';

import { FormScrollView } from '@/components/keyboard';
import { Button } from '@/components/ui/button';
import { Card, Chip, ChipRow } from '@/components/ui/primitives';
import { Content } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { deleteOverride, setOverride, workerKey } from '@/db/translations';
import type { Worker, WorkerInput } from '@/db/types';
import { createWorker, isMobileTaken, listProfessions, updateWorker } from '@/db/workers';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/i18n';
import { PROFESSIONS } from '@/i18n/professions';
import { minorToInput, toMinor } from '@/lib/money';
import { useDb, useDbQuery, useRevalidateAll, useSettings } from '@/providers/database';
import { useTheme } from '@/theme';

type Errors = Partial<Record<'first_name' | 'mobile' | 'daily_wage' | 'profession', string>>;

type Props = {
  worker?: Worker;
  onSaved: (id: string) => void;
  onDelete?: () => void;
};

export function WorkerForm({ worker, onSaved, onDelete }: Props) {
  const db = useDb();
  const revalidateAll = useRevalidateAll();
  const { t, lang, language, profession: localizeProfession, overrides } = useI18n();
  const { currency } = useSettings();
  const { colors } = useTheme();
  const { gutter } = useResponsive();
  const { data: existingProfessions = [] } = useDbQuery('professions', listProfessions);

  const professionOptions = [...new Set([...PROFESSIONS, ...existingProfessions])];
  const initialProfession = worker?.profession ?? 'Helper';
  const isKnown = professionOptions.includes(initialProfession);

  const [firstName, setFirstName] = useState(worker?.first_name ?? '');
  const [lastName, setLastName] = useState(worker?.last_name ?? '');
  const [mobile, setMobile] = useState(worker?.mobile ?? '');
  const [address, setAddress] = useState(worker?.address ?? '');
  const [profession, setProfession] = useState(isKnown ? initialProfession : 'other');
  const [customProfession, setCustomProfession] = useState(isKnown ? '' : initialProfession);
  const [wage, setWage] = useState(worker ? minorToInput(worker.daily_wage) : '');
  const [localName, setLocalName] = useState(worker ? (overrides[workerKey(worker.id)] ?? '') : '');
  const [active, setActive] = useState(worker ? worker.is_active === 1 : true);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const lastNameRef = useRef<TextInputInstance>(null);
  const localNameRef = useRef<TextInputInstance>(null);
  const mobileRef = useRef<TextInputInstance>(null);
  const addressRef = useRef<TextInputInstance>(null);
  const wageRef = useRef<TextInputInstance>(null);

  const save = async () => {
    const next: Errors = {};
    let cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) cleanMobile = cleanMobile.slice(2);
    else if (cleanMobile.length === 11 && cleanMobile.startsWith('0')) cleanMobile = cleanMobile.slice(1);
    const wageMinor = toMinor(wage);
    const finalProfession = profession === 'other' ? customProfession.trim() : profession;

    if (!firstName.trim()) next.first_name = t('form.required');
    if (cleanMobile && !/^[6-9]\d{9}$/.test(cleanMobile)) next.mobile = t('form.invalidMobile');
    else if (cleanMobile && (await isMobileTaken(db, cleanMobile, worker?.id))) next.mobile = t('form.mobileTaken');
    if (wageMinor === null || wageMinor <= 0) next.daily_wage = t('form.invalidAmount');
    if (!finalProfession) next.profession = t('form.required');

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const input: WorkerInput = {
      first_name: firstName.trim(),
      last_name: lastName.trim() || null,
      mobile: cleanMobile || null,
      address: address.trim() || null,
      profession: finalProfession,
      daily_wage: wageMinor!,
      is_active: active,
    };

    setSaving(true);
    try {
      let id = worker?.id;
      if (id) await updateWorker(db, id, input);
      else id = await createWorker(db, input);

      if (lang !== 'en') {
        if (localName.trim()) await setOverride(db, lang, workerKey(id), localName.trim());
        else await deleteOverride(db, lang, workerKey(id));
      }
      await revalidateAll();
      onSaved(id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 32 }}>
      <Content style={styles.form}>
        <View style={styles.pair}>
          <View style={styles.flex}>
            <TextField
              label={t('form.firstName')}
              value={firstName}
              onChangeText={setFirstName}
              error={errors.first_name}
              autoCapitalize="words"
              autoComplete="name-given"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => lastNameRef.current?.focus()}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              ref={lastNameRef}
              label={t('form.lastName')}
              placeholder={t('form.optional')}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoComplete="name-family"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => (lang !== 'en' ? localNameRef : mobileRef).current?.focus()}
            />
          </View>
        </View>

        {lang !== 'en' ? (
          <TextField
            ref={localNameRef}
            label={t('form.localName')}
            placeholder={[firstName, lastName].filter(Boolean).join(' ') || t('form.optional')}
            hint={t('form.localNameHint')}
            value={localName}
            onChangeText={setLocalName}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => mobileRef.current?.focus()}
          />
        ) : null}

        <TextField
          ref={mobileRef}
          label={t('form.mobile')}
          placeholder={t('form.optional')}
          value={mobile}
          onChangeText={(v) => setMobile(v.replace(/[^\d+\s]/g, ''))}
          error={errors.mobile}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={14}
          icon="call-outline"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => addressRef.current?.focus()}
        />

        <TextField
          ref={addressRef}
          label={t('form.address')}
          placeholder={t('form.optional')}
          value={address}
          onChangeText={setAddress}
          autoCapitalize="sentences"
          autoComplete="street-address"
          textContentType="fullStreetAddress"
          icon="location-outline"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => wageRef.current?.focus()}
        />

        <View style={styles.group}>
          <Text variant="label">{t('form.profession')}</Text>
          <ChipRow wrap>
            {professionOptions.map((p) => (
              <Chip key={p} label={localizeProfession(p)} selected={profession === p} onPress={() => setProfession(p)} />
            ))}
            <Chip label={t('form.otherProfession')} selected={profession === 'other'} onPress={() => setProfession('other')} />
          </ChipRow>
          {profession === 'other' ? (
            <TextField
              placeholder={t('form.otherProfession')}
              value={customProfession}
              onChangeText={setCustomProfession}
              error={errors.profession}
              autoCapitalize="words"
              autoFocus={!customProfession}
            />
          ) : null}
        </View>

        <TextField
          ref={wageRef}
          label={t('form.dailyWage')}
          prefix={currency}
          value={wage}
          onChangeText={(v) => setWage(v.replace(/[^\d.]/g, ''))}
          error={errors.daily_wage}
          keyboardType="decimal-pad"
          returnKeyType="done"
          onSubmitEditing={save}
        />

        <Card style={styles.switchCard}>
          <View style={styles.flex}>
            <Text variant="bodyStrong">{t('form.active')}</Text>
            <Text variant="caption" tone="muted">
              {t('form.activeHint')}
            </Text>
          </View>
          <Switch
            value={active}
            onValueChange={setActive}
            accessibilityLabel={t('form.active')}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.surface}
          />
        </Card>

        <Button label={t('form.save')} size="lg" icon="checkmark" onPress={save} loading={saving} fullWidth />
        {onDelete ? (
          <Button label={t('form.delete')} variant="danger" icon="trash-outline" onPress={onDelete} fullWidth />
        ) : null}
        <Text variant="caption" tone="muted" align="center">
          {language.code !== 'en' ? t('tr.typingTip') : ''}
        </Text>
      </Content>
    </FormScrollView>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18, maxWidth: 640 },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  flex: { flex: 1, minWidth: 180 },
  group: { gap: 10 },
  switchCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
});
