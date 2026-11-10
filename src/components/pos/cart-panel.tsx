import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { numberSetting } from '@/db/meta';
import { computeTotals } from '@/db/orders';
import { useSaveOrder } from '@/hooks/use-save-order';
import { useI18n } from '@/i18n';
import { confirm } from '@/lib/confirm';
import { formatMoney } from '@/lib/money';
import { useCart } from '@/providers/cart';
import { useSettings } from '@/providers/database';
import { radius, useTheme } from '@/theme';

import { FormScrollView } from '../keyboard';
import { Button, IconButton } from '../ui/button';
import { EmptyState } from '../ui/primitives';
import { Text } from '../ui/text';
import { TextField } from '../ui/text-field';
import { OrderTarget } from './order-target';
import { QuantityBar } from './quantity-bar';

export function TotalsRows({
  subtotal,
  discount,
  tax,
  taxPercent,
  roundOff,
  total,
}: {
  subtotal: number;
  discount: number;
  tax: number;
  taxPercent: number;
  roundOff: number;
  total: number;
}) {
  const { t } = useI18n();
  const { currency } = useSettings();
  const rows: [string, number][] = [[t('ord.subtotal'), subtotal]];
  if (discount) rows.push([t('ord.discount'), -discount]);
  if (taxPercent) rows.push([t('ord.tax', { rate: taxPercent }), tax]);
  if (roundOff) rows.push([t('ord.roundOff'), roundOff]);
  return (
    <View style={styles.totals}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.totalRow}>
          <Text tone="muted">{label}</Text>
          <Text numeric tone="muted">
            {formatMoney(value, currency)}
          </Text>
        </View>
      ))}
      <View style={styles.totalRow}>
        <Text variant="heading">{t('ord.total')}</Text>
        <Text variant="title" numeric>
          {formatMoney(total, currency)}
        </Text>
      </View>
    </View>
  );
}

/** The order being built or edited, with quantity bars and save actions. */
export function CartPanel({
  showTarget = true,
  onSaved,
}: {
  showTarget?: boolean;
  onSaved?: (orderId: string, billed: boolean) => void;
}) {
  const { colors } = useTheme();
  const { t, itemName } = useI18n();
  const settings = useSettings();
  const cart = useCart();
  const { save, saving } = useSaveOrder();
  const { draft } = cart;
  const taxPercent = settings.gstin?.trim() ? numberSetting(settings.taxPercent, 0) : 0;
  const totals = computeTotals(draft.lines, 0, taxPercent);

  const submit = async (bill: boolean) => {
    const id = await save({ bill });
    if (!id) return;
    if (onSaved) onSaved(id, bill);
    else if (bill) router.push(`/order/${id}`);
  };

  const clear = async () => {
    const ok = await confirm({
      title: t('pos.discardTitle'),
      confirmLabel: t('pos.clear'),
      cancelLabel: t('form.cancel'),
      destructive: true,
    });
    if (ok) cart.reset(true);
  };

  return (
    <View style={styles.flex}>
      <FormScrollView contentContainerStyle={styles.content}>
        {showTarget ? <OrderTarget /> : null}
        <View style={styles.titleRow}>
          <Text variant="heading" style={styles.flex} accessibilityRole="header">
            {t('pos.cart')}
          </Text>
          {draft.lines.length > 0 && !draft.orderId ? (
            <Button label={t('pos.clear')} variant="ghost" icon="trash-outline" onPress={clear} />
          ) : null}
        </View>

        {draft.lines.length === 0 ? (
          <EmptyState icon="fast-food-outline" title={t('pos.emptyCart')} />
        ) : (
          draft.lines.map((line, index) => {
            const name = itemName(line.item_id, line.name);
            return (
              <View
                key={`${line.item_id ?? line.name}-${index}`}
                style={[styles.line, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.lineTop}>
                  <View style={styles.flex}>
                    <Text variant="bodyStrong" numberOfLines={2}>
                      {name}
                    </Text>
                    <Text variant="caption" tone="muted" numeric>
                      {formatMoney(line.price, settings.currency)} × {line.qty}
                    </Text>
                  </View>
                  <Text variant="bodyStrong" numeric>
                    {formatMoney(line.price * line.qty, settings.currency)}
                  </Text>
                  <IconButton
                    icon="trash-outline"
                    label={`${t('pos.remove')} ${name}`}
                    variant="ghost"
                    onPress={() => cart.remove(index)}
                  />
                </View>
                <QuantityBar
                  value={line.qty}
                  label={name}
                  onChange={(qty) => cart.setQty(index, qty)}
                  onRemove={() => cart.remove(index)}
                />
              </View>
            );
          })
        )}

        {draft.lines.length > 0 ? (
          <>
            {draft.type === 'takeaway' ? (
              <TextField
                label={t('pos.customer')}
                placeholder={t('form.optional')}
                value={draft.customerName}
                onChangeText={(v) => cart.setField('customerName', v)}
                autoCapitalize="words"
                returnKeyType="next"
              />
            ) : null}
            <TextField
              label={t('pos.note')}
              placeholder={t('form.optional')}
              value={draft.note}
              onChangeText={(v) => cart.setField('note', v)}
              maxLength={140}
            />
            <TotalsRows
              subtotal={totals.subtotal}
              discount={0}
              tax={totals.tax}
              taxPercent={taxPercent}
              roundOff={totals.round_off}
              total={totals.total}
            />
          </>
        ) : null}
      </FormScrollView>

      {draft.lines.length > 0 ? (
        <View style={[styles.actions, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {draft.orderId ? (
            <Button
              label={t('pos.saveChanges')}
              variant="secondary"
              icon="restaurant-outline"
              onPress={() => submit(false)}
              disabled={saving}
              style={styles.flex}
              size="lg"
            />
          ) : null}
          <Button
            label={t('pos.saveAndBill')}
            icon="receipt-outline"
            onPress={() => submit(true)}
            loading={saving}
            style={styles.flex}
            size="lg"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  line: { borderWidth: 1, borderRadius: radius.md, padding: 10, gap: 8 },
  lineTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totals: { gap: 6, paddingTop: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
