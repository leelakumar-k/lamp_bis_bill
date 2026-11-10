import type { ReactNode } from 'react';
import { ScrollView, type ViewStyle } from 'react-native';

// Browsers handle the on-screen keyboard themselves; keyboard-controller is native-only.
export function KeyboardProvider({ children }: { children: ReactNode }) {
  return children;
}

export function FormScrollView({
  children,
  contentContainerStyle,
}: {
  children: ReactNode;
  contentContainerStyle?: ViewStyle;
  toolbar?: boolean;
}) {
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={contentContainerStyle}>
      {children}
    </ScrollView>
  );
}
