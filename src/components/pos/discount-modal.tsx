import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text as RNText,
  TextInput,
  type TextInputInstance,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { formatMoney, minorToInput, toMinor } from '@/lib/money';
import { radius, useTheme } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onApply: (discountMinor: number) => void;
  subtotalMinor: number;
  currentDiscountMinor: number;
  currency: string;
};

export function DiscountModal({
  visible,
  onClose,
  onApply,
  subtotalMinor,
  currentDiscountMinor,
  currency,
}: Props) {
  const { colors } = useTheme();
  const [input, setInput] = useState('');
  const inputRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    if (visible) {
      setInput(currentDiscountMinor > 0 ? minorToInput(currentDiscountMinor) : '');
      const t1 = setTimeout(() => inputRef.current?.focus(), 50);
      const t2 = setTimeout(() => inputRef.current?.focus(), 200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [visible, currentDiscountMinor]);

  const handleTextChange = (v: string) => {
    const cleaned = v.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      setInput(parts[0] + '.' + parts.slice(1).join(''));
    } else {
      setInput(cleaned);
    }
  };

  const handleApply = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      onApply(0);
      onClose();
      return;
    }
    const minor = toMinor(trimmed);
    if (minor === null || minor < 0) return;
    onApply(minor);
    onClose();
  };

  const handleRemove = () => {
    onApply(0);
    onClose();
  };

  const setPercent = (percent: number) => {
    const discountPaise = Math.round((subtotalMinor * percent) / 100);
    setInput(minorToInput(discountPaise));
    inputRef.current?.focus();
  };

  const setFixed = (rupees: number) => {
    setInput(String(rupees));
    inputRef.current?.focus();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => {
        setTimeout(() => inputRef.current?.focus(), 50);
      }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text variant="heading">
                {currentDiscountMinor > 0 ? 'Edit Discount' : 'Add Discount'}
              </Text>
              <Text variant="caption" tone="muted">
                Order subtotal: {formatMoney(subtotalMinor, currency)}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Large, clearly visible input box */}
          <Pressable
            style={[styles.inputBox, { borderColor: colors.primary, backgroundColor: colors.surfaceMuted }]}
            onPress={() => inputRef.current?.focus()}>
            <RNText style={[styles.currencyPrefix, { color: colors.primary }]}>{currency}</RNText>
            <TextInput
              ref={inputRef}
              autoFocus
              showSoftInputOnFocus
              value={input}
              onChangeText={handleTextChange}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text }]}
              selectionColor={colors.primary}
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={handleApply}
            />
          </Pressable>

          {/* Quick preset chips */}
          <View style={styles.presetsRow}>
            <Pressable
              style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
              onPress={() => setPercent(5)}>
              <Text variant="label" style={{ color: colors.text }}>5%</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
              onPress={() => setPercent(10)}>
              <Text variant="label" style={{ color: colors.text }}>10%</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
              onPress={() => setPercent(15)}>
              <Text variant="label" style={{ color: colors.text }}>15%</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
              onPress={() => setFixed(20)}>
              <Text variant="label" style={{ color: colors.text }}>{currency}20</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
              onPress={() => setFixed(50)}>
              <Text variant="label" style={{ color: colors.text }}>{currency}50</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
              onPress={() => setFixed(100)}>
              <Text variant="label" style={{ color: colors.text }}>{currency}100</Text>
            </Pressable>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            <Button
              label="Apply Discount"
              icon="checkmark"
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleApply}
            />
            {currentDiscountMinor > 0 ? (
              <Button
                label="Remove Discount"
                icon="trash-outline"
                variant="danger"
                size="md"
                fullWidth
                onPress={handleRemove}
              />
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  closeBtn: {
    padding: 4,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    height: 64,
    gap: 8,
  },
  currencyPrefix: {
    fontSize: 28,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    paddingVertical: 0,
    minHeight: 48,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
});
