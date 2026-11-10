export type Palette = {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  accent: string;
  accentSoft: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
  /** Thermal paper is light in both themes. */
  paper: string;
  ink: string;
};

export const palettes: Record<'light' | 'dark', Palette> = {
  light: {
    background: '#F2F4F1',
    surface: '#FFFFFF',
    surfaceMuted: '#E8ECE8',
    border: '#D9DFDA',
    text: '#16201C',
    textMuted: '#5B6862',
    primary: '#1E6B52',
    primarySoft: '#DCEDE5',
    onPrimary: '#FFFFFF',
    accent: '#B87A00',
    accentSoft: '#F6EBCF',
    danger: '#B23A2C',
    dangerSoft: '#F6E0DC',
    overlay: 'rgba(22,32,28,0.45)',
    paper: '#FFFFFF',
    ink: '#16201C',
  },
  dark: {
    background: '#0E1412',
    surface: '#17201C',
    surfaceMuted: '#202B26',
    border: '#2A3631',
    text: '#E7EDEA',
    textMuted: '#98A69F',
    primary: '#46B88E',
    primarySoft: '#1C3A2F',
    onPrimary: '#06140F',
    accent: '#E9B23F',
    accentSoft: '#3A2F15',
    danger: '#EE7464',
    dangerSoft: '#3D1F1B',
    overlay: 'rgba(0,0,0,0.6)',
    paper: '#F2F4F1',
    ink: '#16201C',
  },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const MIN_TOUCH = 44;
