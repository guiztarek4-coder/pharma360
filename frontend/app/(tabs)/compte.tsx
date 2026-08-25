import React from "react";
import { View, ScrollView, Pressable, StyleSheet, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { Txt, Button, shadowCard } from "@/src/components/ui";
import { useAuth } from "@/src/store/auth";
import { useFavorites } from "@/src/store/favorites";
import { initials } from "@/src/lib/format";

function Row({ icon, label, onPress, danger, testID }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; danger?: boolean; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 15, paddingHorizontal: 16 }}>
      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: danger ? colors.dangerSoft : colors.tintSoft, alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon} size={18} color={danger ? colors.danger : colors.primary} />
      </View>
      <Txt family="display" weight={500} size={15} color={danger ? colors.danger : colors.text} style={{ flex: 1 }}>
        {label}
      </Txt>
      <Feather name="chevron-right" size={20} color={colors.textLight} />
    </Pressable>
  );
}

export default function Compte() {
  const { colors, settings } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { ids } = useFavorites();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 6, paddingBottom: 12, paddingHorizontal: 16 }}>
        <Txt family="display" weight={700} size={22}>
          Mon Compte
        </Txt>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {user ? (
          <View style={{ paddingHorizontal: 16 }}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
                <Txt family="display" weight={700} size={20} color="#fff">
                  {initials(user.first_name, user.last_name)}
                </Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt family="display" weight={700} size={18} color="#fff">
                  {user.first_name} {user.last_name}
                </Txt>
                <Txt size={12.5} color="rgba(255,255,255,0.9)">
                  {user.email}
                </Txt>
              </View>
            </LinearGradient>

            <Pressable onPress={() => router.push("/fidelite")} style={[{ marginTop: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }, shadowCard]}>
              <Feather name="award" size={22} color={colors.gold} />
              <View style={{ flex: 1 }}>
                <Txt family="display" weight={700} size={16}>
                  {user.loyalty_points ?? 0} points
                </Txt>
                <Txt size={12} color={colors.textMuted}>
                  Programme de fidélité
                </Txt>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textLight} />
            </Pressable>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            <View style={[{ backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 20, alignItems: "center", gap: 6 }, shadowCard]}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.tintSoft, alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                <Feather name="user" size={26} color={colors.primary} />
              </View>
              <Txt family="display" weight={700} size={18}>
                Bienvenue sur Pharma360
              </Txt>
              <Txt size={13} color={colors.textMuted} center style={{ marginBottom: 12 }}>
                Connectez-vous pour suivre vos commandes et gagner des points fidélité.
              </Txt>
              <Button testID="login-cta" title="Se connecter" onPress={() => router.push("/auth/login")} style={{ alignSelf: "stretch" }} />
              <Pressable testID="register-cta" onPress={() => router.push("/auth/register")} style={{ paddingVertical: 8 }}>
                <Txt weight={600} size={14} color={colors.primary}>
                  Créer un compte
                </Txt>
              </Pressable>
            </View>
          </View>
        )}

        <View style={{ marginTop: 20, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
          {user ? <Row testID="menu-orders" icon="package" label="Mes commandes" onPress={() => router.push("/commandes")} /> : null}
          <Row testID="menu-favorites" icon="heart" label={`Mes favoris${ids.length ? ` (${ids.length})` : ""}`} onPress={() => router.push("/catalogue")} />
          <Row testID="menu-loyalty" icon="award" label="Programme de fidélité" onPress={() => router.push("/fidelite")} />
          <Row testID="menu-pharmacy" icon="map-pin" label="Notre pharmacie" onPress={() => router.push("/pharmacie")} />
          <Row testID="menu-blog" icon="book-open" label="Conseils & astuces" onPress={() => router.push("/blog")} />
        </View>

        <View style={{ marginTop: 16, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
          <Row icon="phone" label="Appeler la pharmacie" onPress={() => Linking.openURL(`tel:${settings?.phone_link || settings?.phone || ""}`)} />
          {settings?.whatsapp_number ? <Row icon="message-circle" label="WhatsApp" onPress={() => Linking.openURL(`https://wa.me/${(settings.whatsapp_number || "").replace(/[^0-9]/g, "")}`)} /> : null}
          {user ? <Row testID="logout-btn" icon="log-out" label="Se déconnecter" danger onPress={logout} /> : null}
        </View>

        <Txt size={11} color={colors.textLight} center style={{ marginTop: 20 }}>
          Pharma360 · {settings?.address || "Alger, Algérie"}
        </Txt>
      </ScrollView>
    </View>
  );
}
