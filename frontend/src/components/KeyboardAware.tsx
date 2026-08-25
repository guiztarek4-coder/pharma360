import React from "react";
import { KeyboardAvoidingView, ScrollView, Platform, View, ScrollViewProps, ViewProps } from "react-native";

// Drop-in replacements for react-native-keyboard-controller built on RN
// primitives — guaranteed to work in Expo Go (no extra native module).

export function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  keyboardShouldPersistTaps = "handled",
  style,
  // accepted but unused (API compat with keyboard-controller)
  bottomOffset,
  ...rest
}: ScrollViewProps & { bottomOffset?: number; children?: React.ReactNode }) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style as any]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        {...rest}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function KeyboardStickyView({
  children,
  offset,
  ...rest
}: ViewProps & { offset?: { closed?: number; opened?: number }; children?: React.ReactNode }) {
  return <View {...rest}>{children}</View>;
}
