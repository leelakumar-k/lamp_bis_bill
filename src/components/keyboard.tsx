import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { KeyboardAwareScrollView, KeyboardToolbar } from 'react-native-keyboard-controller';

export { KeyboardProvider } from 'react-native-keyboard-controller';

type FormScrollViewProps = {
  children: ReactNode;
  contentContainerStyle?: ViewStyle;
  /** Shows the prev / next / done bar above the keyboard. */
  toolbar?: boolean;
};

/**
 * Scrolls the focused input above the keyboard on both iOS and Android (including
 * edge-to-edge Android, where the window no longer resizes for the keyboard).
 */
export function FormScrollView({ children, contentContainerStyle, toolbar = true }: FormScrollViewProps) {
  return (
    <>
      <KeyboardAwareScrollView
        bottomOffset={toolbar ? 72 : 24}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}>
        {children}
      </KeyboardAwareScrollView>
      {toolbar ? <KeyboardToolbar /> : null}
    </>
  );
}
