import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { type Palette, useTheme } from '@/theme';
import { fontFamily } from '@/theme/fonts';

const variants = {
  display: { fontSize: 30, lineHeight: 38, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontSize: 22, lineHeight: 30, fontWeight: '700', letterSpacing: -0.2 },
  heading: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
} satisfies Record<string, TextStyle>;

type Tone = 'default' | 'muted' | 'primary' | 'danger' | 'accent' | 'onPrimary';

const toneColor = (colors: Palette, tone: Tone) =>
  ({
    default: colors.text,
    muted: colors.textMuted,
    primary: colors.primary,
    danger: colors.danger,
    accent: colors.accent,
    onPrimary: colors.onPrimary,
  })[tone];

export type AppTextProps = TextProps & {
  variant?: keyof typeof variants;
  tone?: Tone;
  numeric?: boolean;
  align?: TextStyle['textAlign'];
};

export function Text({ variant = 'body', tone = 'default', numeric, align, style, ...props }: AppTextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      {...props}
      style={[
        variants[variant],
        { color: toneColor(colors, tone), textAlign: align, fontFamily },
        numeric && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}
