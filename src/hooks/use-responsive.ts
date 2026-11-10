import { useWindowDimensions } from 'react-native';

/**
 * Layout decisions are based on the live window size, so the same build adapts to phones,
 * tablets, rotation and split-screen/multitasking without any install-time configuration.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;
  const isWide = width >= 900;
  const gridColumns = width >= 1200 ? 3 : width >= 700 ? 2 : 1;
  const contentMaxWidth = isWide ? 1100 : 760;
  const gutter = width >= 700 ? 24 : 16;
  return { width, height, isTablet, isWide, gridColumns, contentMaxWidth, gutter };
}
