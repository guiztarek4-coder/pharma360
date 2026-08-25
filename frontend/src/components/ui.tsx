import React from "react";
import {
  Text,
  TextProps,
  Pressable,
  ActivityIndicator,
  View,
  StyleSheet,
  ViewStyle,
  Animated,
  Easing,
  ScrollView,
  Modal,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, font } from "@/src/theme/theme";

/* ---------------- Text ---------------- */
export function Txt(
  props: TextProps & {
    family?: "display" | "text";
    weight?: 400 | 500 | 600 | 700;
    size?: number;
    color?: string;
    center?: boolean;
  }
) {
  const { colors } = useTheme();
  const { family = "text", weight = 400, size = 14, color, center, style, ...rest } = props;
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: font(family, weight), fontSize: size, color: color || colors.text, textAlign: center ? "center" : undefined },
        style,
      ]}
    />
  );
}

/* ---------------- Button ---------------- */
export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  style,
  testID,
  size = "md",
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "outline" | "ghost" | "dark";
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  style?: ViewStyle;
  testID?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { colors } = useTheme();
  const h = size === "lg" ? 54 : size === "sm" ? 40 : 48;
  const isPrimary = variant === "primary";
  const isDark = variant === "dark";
  const bg = isPrimary ? colors.primary : isDark ? colors.text : variant === "outline" ? "transparent" : "transparent";
  const border = variant === "outline" ? colors.border : "transparent";
  const fg = isPrimary || isDark ? "#FFFFFF" : variant === "outline" ? colors.text : colors.primary;
  return (
    <Pressable
      testID={testID}
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        {
          height: h,
          borderRadius: 14,
          backgroundColor: bg,
          borderWidth: variant === "outline" ? 1.5 : 0,
          borderColor: border,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          paddingHorizontal: 18,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={size === "lg" ? 20 : 18} color={fg} /> : null}
          <Text style={{ fontFamily: font("display", 600), fontSize: size === "lg" ? 16 : 15, color: fg }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/* ---------------- Chip ---------------- */
export function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={{
        height: 36,
        flexShrink: 0,
        paddingHorizontal: 16,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text style={{ fontFamily: font("text", 600), fontSize: 13, color: active ? "#fff" : colors.textMuted }}>{label}</Text>
    </Pressable>
  );
}

/* ---------------- Badge (discount / new) ---------------- */
export function Badge({ text, color, bg }: { text: string; color?: string; bg?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: bg || colors.danger, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
      <Text style={{ fontFamily: font("display", 700), fontSize: 11, color: color || "#fff" }}>{text}</Text>
    </View>
  );
}

/* ---------------- Skeleton ---------------- */
export function Skeleton({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();
  const anim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });
  return <Animated.View style={[{ backgroundColor: colors.surfaceAlt, borderRadius: 10, opacity }, style]} />;
}

/* ---------------- States ---------------- */
export function EmptyState({
  icon = "inbox",
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", padding: 32, gap: 10 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.tintSoft, alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon} size={30} color={colors.primary} />
      </View>
      <Txt family="display" weight={600} size={18} center>
        {title}
      </Txt>
      {subtitle ? (
        <Txt color={colors.textMuted} size={14} center style={{ lineHeight: 20 }}>
          {subtitle}
        </Txt>
      ) : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} style={{ marginTop: 8, paddingHorizontal: 28 }} /> : null}
    </View>
  );
}

/* ---------------- Screen header (sticky, safe-area aware) ---------------- */
export function ScreenHeader({
  title,
  onBack,
  right,
  subtitle,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 6, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: colors.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", gap: 12 }}>
      {onBack ? (
        <Pressable testID="header-back" onPress={onBack} hitSlop={10} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Txt family="display" weight={700} size={20} numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt color={colors.textMuted} size={12} numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/* ---------------- Bottom sheet (Modal based) ---------------- */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={onClose} />
      <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 12, maxHeight: "82%" }}>
        <View style={{ alignItems: "center", paddingTop: 10 }}>
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 }}>
          <Txt family="display" weight={700} size={18}>
            {title}
          </Txt>
          <Pressable testID="sheet-close" onPress={onClose} hitSlop={10}>
            <Feather name="x" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

export const shadowCard = Platform.select({
  ios: { shadowColor: "#1a1a1a", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 2 },
  default: {},
}) as ViewStyle;
