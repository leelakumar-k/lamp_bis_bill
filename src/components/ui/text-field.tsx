import { Ionicons } from '@expo/vector-icons';
import { type Ref, useId, useState } from 'react';
import { Platform, StyleSheet, TextInput, type TextInputInstance, type TextInputProps, View } from 'react-native';

import { radius, useTheme } from '@/theme';
import { fontFamily } from '@/theme/fonts';

import type { IconName } from './button';
import { Text } from './text';

type TextFieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: IconName;
  prefix?: string;
  ref?: Ref<TextInputInstance>;
};

export function TextField({ label, hint, error, icon, prefix, style, multiline, ref, ...props }: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const id = useId();
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text variant="label" nativeID={`${id}-label`}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          multiline && styles.multiline,
          { borderColor, backgroundColor: colors.surface, borderWidth: focused || error ? 2 : 1 },
        ]}>
        {icon ? <Ionicons name={icon} size={18} color={colors.textMuted} /> : null}
        {prefix ? (
          <Text variant="bodyStrong" tone="muted">
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label ?? props.placeholder}
          accessibilityLabelledBy={label ? `${id}-label` : undefined}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          multiline={multiline}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[styles.input, { color: colors.text, fontFamily }, multiline && styles.multilineInput, style]}
        />
      </View>
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const webNoOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as object;

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  field: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  multiline: { alignItems: 'flex-start', paddingVertical: 12 },
  // The field's own focus border replaces the browser outline on web.
  input: { flex: 1, fontSize: 16, paddingVertical: 12, minWidth: 0, ...webNoOutline },
  multilineInput: { minHeight: 80, paddingVertical: 0, textAlignVertical: 'top' },
});
