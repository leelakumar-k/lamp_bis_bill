import { createContext, type ReactNode, use, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useSettings } from '@/providers/database';

import { type Palette, palettes } from './tokens';

type ThemeValue = { scheme: 'light' | 'dark'; colors: Palette };

const ThemeContext = createContext<ThemeValue>({ scheme: 'light', colors: palettes.light });

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const { theme } = useSettings();
  const scheme = theme === 'system' ? (system === 'dark' ? 'dark' : 'light') : theme;
  const value = useMemo(() => ({ scheme, colors: palettes[scheme] }), [scheme]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export const useTheme = () => use(ThemeContext);

export * from './tokens';
