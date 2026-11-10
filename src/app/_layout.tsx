import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Suspense, useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { KeyboardProvider } from '@/components/keyboard';
import { ToastProvider } from '@/components/toast';
import { useAutoSync } from '@/hooks/use-auto-sync';
import { I18nProvider } from '@/i18n';
import { CartProvider } from '@/providers/cart';
import { DatabaseProvider } from '@/providers/database';
import { PrinterProvider } from '@/providers/printer-context';
import { AppThemeProvider, useTheme } from '@/theme';
import { loadWebFonts } from '@/theme/fonts';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <Suspense fallback={null}>
            <DatabaseProvider>
              <AppThemeProvider>
                <I18nProvider>
                  <CartProvider>
                    <AppShell />
                  </CartProvider>
                </I18nProvider>
              </AppThemeProvider>
            </DatabaseProvider>
          </Suspense>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

loadWebFonts();

function AppShell() {
  const { scheme, colors } = useTheme();
  const [iconsLoaded] = useFonts(Ionicons.font);
  useAutoSync();

  useEffect(() => {
    if (iconsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [iconsLoaded]);

  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [scheme, colors]);

  if (!iconsLoaded) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <ToastProvider>
        <PrinterProvider>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="cart" options={{ presentation: 'modal' }} />
            <Stack.Screen name="language" options={{ presentation: 'modal' }} />
            <Stack.Screen name="account" options={{ presentation: 'card' }} />
          </Stack>
        </PrinterProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
