import { createContext, type ReactNode, use, useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, useTheme } from '@/theme';

import { Text } from './ui/text';

type ToastOptions = { message: string; actionLabel?: string; onAction?: () => void; duration?: number };
type ToastState = ToastOptions & { id: number };

const ToastContext = createContext<(options: ToastOptions) => void>(() => {});

/** Bottom offset keeps the toast clear of the tab bar on tab screens. */
export function ToastProvider({ children, bottomOffset = 72 }: { children: ReactNode; bottomOffset?: number }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const show = useCallback((options: ToastOptions) => {
    clearTimeout(timer.current);
    const id = Date.now();
    setToast({ ...options, id });
    timer.current = setTimeout(() => setToast((t) => (t?.id === id ? null : t)), options.duration ?? 4000);
  }, []);

  return (
    <ToastContext value={show}>
      {children}
      <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + bottomOffset }]}>
        {toast ? (
          <Animated.View
            key={toast.id}
            entering={FadeInDown.duration(180)}
            exiting={FadeOutDown.duration(150)}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={[styles.toast, { backgroundColor: colors.text }]}>
            <Text variant="label" style={[styles.message, { color: colors.background }]} numberOfLines={2}>
              {toast.message}
            </Text>
            {toast.actionLabel ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
                style={styles.action}>
                <Text variant="label" style={{ color: colors.background, fontWeight: '700' }}>
                  {toast.actionLabel}
                </Text>
              </Pressable>
            ) : null}
          </Animated.View>
        ) : null}
      </View>
    </ToastContext>
  );
}

export const useToast = () => use(ToastContext);

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    width: '100%',
    maxWidth: 520,
    minHeight: 52,
    borderRadius: radius.md,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  message: { flex: 1, paddingVertical: 12 },
  action: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
});
