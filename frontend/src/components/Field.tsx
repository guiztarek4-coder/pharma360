import React, { useState } from "react";
import { View, TextInput, TextInputProps, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme, font } from "@/src/theme/theme";
import { Txt } from "@/src/components/ui";

export function Field({
  label,
  icon,
  secure,
  style,
  testID,
  ...rest
}: TextInputProps & { label?: string; icon?: keyof typeof Feather.glyphMap; secure?: boolean; testID?: string }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hide, setHide] = useState(!!secure);

  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Txt weight={600} size={13} color={colors.textMuted}>
          {label}
        </Txt>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          height: 52,
          borderRadius: 14,
          backgroundColor: colors.surface,
          borderWidth: 1.5,
          borderColor: focused ? colors.primary : colors.border,
          paddingHorizontal: 14,
        }}
      >
        {icon ? <Feather name={icon} size={18} color={focused ? colors.primary : colors.textLight} /> : null}
        <TextInput
          testID={testID}
          {...rest}
          secureTextEntry={hide}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={colors.textLight}
          style={[{ flex: 1, fontFamily: font("text", 400), fontSize: 15, color: colors.text, paddingVertical: 0 }, style as any]}
        />
        {secure ? (
          <Pressable onPress={() => setHide((h) => !h)} hitSlop={8}>
            <Feather name={hide ? "eye" : "eye-off"} size={18} color={colors.textLight} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
