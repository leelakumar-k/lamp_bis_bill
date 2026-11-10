import { useRef } from 'react';
import { type GestureResponderEvent, StyleSheet, View } from 'react-native';

import { MAX_QTY } from '@/db/pos-types';
import { useI18n } from '@/i18n';
import { selectionFeedback } from '@/lib/haptics';
import { radius, useTheme } from '@/theme';

import { IconButton } from '../ui/button';
import { Text } from '../ui/text';

// Squared scale: the first half of the bar covers 1–25, so small quantities are easy
// to hit by dragging while bulk orders up to 99 are still one swipe away.
const toQty = (p: number) => Math.round(1 + (MAX_QTY - 1) * Math.pow(Math.min(1, Math.max(0, p)), 2));
const toPosition = (qty: number) => Math.sqrt((qty - 1) / (MAX_QTY - 1));

type Props = {
  value: number;
  onChange: (qty: number) => void;
  label: string;
  onRemove?: () => void;
};

export function QuantityBar({ value, onChange, label, onRemove }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const track = useRef<React.ElementRef<typeof View>>(null);
  const bounds = useRef({ x: 0, width: 1 });
  const last = useRef(value);

  const isOne = value <= 1;

  const handleDecrease = () => {
    if (isOne) {
      if (onRemove) {
        selectionFeedback();
        onRemove();
      }
    } else {
      update(value - 1);
    }
  };

  const update = (qty: number) => {
    if (qty <= 0 && onRemove) {
      selectionFeedback();
      onRemove();
      return;
    }
    const next = Math.max(1, Math.min(MAX_QTY, qty));
    if (next === last.current) return;
    last.current = next;
    selectionFeedback();
    onChange(next);
  };

  const fromEvent = (e: GestureResponderEvent) => {
    const { x, width } = bounds.current;
    update(toQty((e.nativeEvent.pageX - x) / width));
  };

  return (
    <View style={styles.row}>
      <IconButton
        icon={isOne ? 'trash-outline' : 'remove'}
        label={isOne ? t('pos.remove') : t('pos.decrease')}
        variant={isOne ? 'danger' : 'soft'}
        onPress={handleDecrease}
        style={styles.step}
      />
      <View
        ref={track}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${label}, ${t('pos.qty')}`}
        accessibilityValue={{ min: 1, max: MAX_QTY, now: value, text: String(value) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => update(value + (e.nativeEvent.actionName === 'increment' ? 1 : -1))}
        onLayout={() => {
          if (typeof track.current?.measureInWindow === 'function') {
            track.current.measureInWindow((x, _y, width) => {
              bounds.current = { x: x || 0, width: Math.max(1, width || 1) };
            });
          }
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          last.current = value;
          if (typeof track.current?.measureInWindow === 'function') {
            track.current.measureInWindow((x, _y, width) => {
              bounds.current = { x: x || 0, width: Math.max(1, width || 1) };
              fromEvent(e);
            });
          } else {
            fromEvent(e);
          }
        }}
        onResponderMove={fromEvent}
        style={[styles.track, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
        <View
          pointerEvents="none"
          style={[
            styles.fill,
            { width: `${Math.max(8, toPosition(value) * 100)}%`, backgroundColor: colors.primarySoft },
          ]}
        />
        <View pointerEvents="none" style={styles.labelWrap}>
          <Text variant="heading" numeric style={{ color: colors.primary }}>
            {value}
          </Text>
        </View>
      </View>
      <IconButton
        icon="add"
        label={t('pos.increase')}
        variant="soft"
        onPress={() => update(value + 1)}
        disabled={value >= MAX_QTY}
        style={styles.step}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  step: { width: 40, height: 40, borderRadius: radius.sm },
  track: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  labelWrap: { alignItems: 'center' },
});
