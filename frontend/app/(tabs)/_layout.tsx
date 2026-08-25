import React from "react";
import { View, Pressable, Platform, StyleSheet, Text } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, font } from "@/src/theme/theme";
import { useCart } from "@/src/store/cart";

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  index: "home",
  catalogue: "grid",
  panier: "shopping-bag",
  compte: "user",
};
const LABELS: Record<string, string> = {
  index: "Accueil",
  catalogue: "Catalogue",
  panier: "Panier",
  compte: "Compte",
};

function TabBar({ state, navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { count } = useCart();

  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
      <BlurView
        intensity={Platform.OS === "ios" ? 40 : 0}
        tint="light"
        style={{
          paddingBottom: insets.bottom || 8,
          paddingTop: 8,
          flexDirection: "row",
          backgroundColor: Platform.OS === "ios" ? "rgba(255,255,255,0.85)" : colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        }}
      >
        {state.routes.map((route: any, i: number) => {
          const focused = state.index === i;
          const icon = ICONS[route.name] || "circle";
          const showBadge = route.name === "panier" && count > 0;
          return (
            <Pressable
              key={route.key}
              testID={`tab-${route.name}`}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 4 }}
            >
              <View style={{ width: 40, alignItems: "center" }}>
                <Feather name={icon} size={22} color={focused ? colors.primary : colors.textLight} />
                {showBadge ? (
                  <View
                    style={{
                      position: "absolute",
                      top: -5,
                      right: 2,
                      minWidth: 17,
                      height: 17,
                      borderRadius: 9,
                      backgroundColor: colors.danger,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 10, fontFamily: font("display", 700) }}>{count > 9 ? "9+" : String(count)}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ fontSize: 11, fontFamily: font("text", focused ? 600 : 500), color: focused ? colors.primary : colors.textLight }}>
                {LABELS[route.name] || route.name}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="catalogue" />
      <Tabs.Screen name="panier" />
      <Tabs.Screen name="compte" />
    </Tabs>
  );
}
