import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, Txt, Button } from "@/src/components/ui";
import { useAuth } from "@/src/store/auth";
import { useFetch } from "@/src/lib/useFetch";

const TIER_COLORS: Record<string, [string, string]> = {
  bronze: ["#E0A067", "#B26A2E"],
  silver: ["#CFD4DA", "#9099A3"],
  gold: ["#F1D178", "#C79A21"],
};

function tierKey(name: string) {
  const n = (name || "").toLowerCase();
  if (n.includes("gold")) return "gold";
  if (n.includes("silver")) return "silver";
  return "bronze";
}

export default function Fidelite() {
  const { colors, settings } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const loyalty = useFetch<any>(user ? "/loyalty/me" : null, undefined, true);

  const tiers: any[] = settings?.loyalty_tiers || [];
  const rewards: any[] = (settings?.loyalty_rewards || []).filter((r: any) => r.enabled !== false);
  const lifetime = loyalty.data?.lifetime ?? user?.loyalty_lifetime ?? 0;
  const points = loyalty.data?.points ?? user?.loyalty_points ?? 0;

  const currentTier = [...tiers].reverse().find((t) => lifetime >= (t.min || 0)) || null;
  const nextTier = tiers.find((t) => (t.min || 0) > lifetime) || null;
  const progress = nextTier ? Math.min(1, lifetime / (nextTier.min || 1)) : 1;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Programme de fidélité" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: insets.bottom + 30 }}>
        {/* Status card */}
        <LinearGradient colors={currentTier ? TIER_COLORS[tierKey(currentTier.name)] : [colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" }}>
              <Feather name="award" size={26} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Txt weight={700} size={12} color="rgba(255,255,255,0.85)" style={{ letterSpacing: 0.5 }}>
                {user ? "VOTRE STATUT" : "PROGRAMME"}
              </Txt>
              <Txt family="display" weight={700} size={22} color="#fff">
                {user ? currentTier?.name || "Membre" : "Devenez membre"}
              </Txt>
            </View>
          </View>
          {user ? (
            <>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 18 }}>
                <View>
                  <Txt size={11} color="rgba(255,255,255,0.85)">Points disponibles</Txt>
                  <Txt family="display" weight={700} size={20} color="#fff">
                    {points}
                  </Txt>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Txt size={11} color="rgba(255,255,255,0.85)">Points cumulés</Txt>
                  <Txt family="display" weight={700} size={20} color="#fff">
                    {lifetime}
                  </Txt>
                </View>
              </View>
              {nextTier ? (
                <View style={{ marginTop: 16 }}>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.3)", overflow: "hidden" }}>
                    <View style={{ width: `${progress * 100}%`, height: "100%", backgroundColor: "#fff", borderRadius: 4 }} />
                  </View>
                  <Txt size={12} color="rgba(255,255,255,0.95)" style={{ marginTop: 8 }}>
                    Plus que {Math.max(0, (nextTier.min || 0) - lifetime)} points pour atteindre {nextTier.name}
                  </Txt>
                </View>
              ) : (
                <Txt size={12} color="rgba(255,255,255,0.95)" style={{ marginTop: 14 }}>
                  Vous avez atteint le statut maximum 🎉
                </Txt>
              )}
            </>
          ) : (
            <Button title="Se connecter" variant="dark" style={{ marginTop: 18, backgroundColor: "rgba(255,255,255,0.22)" }} onPress={() => router.push("/auth/login")} />
          )}
        </LinearGradient>

        {/* How it works */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.tintSoft, alignItems: "center", justifyContent: "center" }}>
            <Feather name="shopping-bag" size={20} color={colors.primary} />
          </View>
          <Txt size={13} color={colors.textMuted} style={{ flex: 1, lineHeight: 19 }}>
            Gagnez <Txt weight={700} color={colors.text}>{settings?.loyalty_points_per_100da ?? 1} point</Txt> par tranche de 100 DA dépensés, puis échangez-les contre des récompenses.
          </Txt>
        </View>

        {/* Tiers */}
        <View style={{ gap: 12 }}>
          <Txt family="display" weight={700} size={18}>
            Les statuts
          </Txt>
          {tiers.map((t) => {
            const key = tierKey(t.name);
            const c = TIER_COLORS[key];
            return (
              <View key={t.name} style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c[0], alignItems: "center", justifyContent: "center" }}>
                    <Feather name="award" size={18} color="#fff" />
                  </View>
                  <Txt family="display" weight={700} size={16} style={{ flex: 1 }}>
                    {t.name}
                  </Txt>
                  <Txt size={12} weight={600} color={colors.textMuted}>
                    dès {t.min} pts
                  </Txt>
                </View>
                {(t.perks || []).map((p: string, i: number) => (
                  <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", marginTop: 4 }}>
                    <Feather name="check" size={15} color={colors.success} style={{ marginTop: 2 }} />
                    <Txt size={13} color={colors.textMuted} style={{ flex: 1, lineHeight: 18 }}>
                      {p}
                    </Txt>
                  </View>
                ))}
              </View>
            );
          })}
        </View>

        {/* Rewards */}
        {rewards.length ? (
          <View style={{ gap: 12 }}>
            <Txt family="display" weight={700} size={18}>
              Récompenses à échanger
            </Txt>
            {rewards.map((r) => {
              const can = user && points >= r.points;
              return (
                <View key={r.id} style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.tintSoft, alignItems: "center", justifyContent: "center" }}>
                    <Feather name="gift" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt family="display" weight={600} size={15}>
                      {r.label}
                    </Txt>
                    <Txt size={12} color={colors.textMuted}>
                      {r.points} points
                    </Txt>
                  </View>
                  <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: can ? colors.primary : colors.surfaceAlt }}>
                    <Txt size={12} weight={700} color={can ? "#fff" : colors.textLight}>
                      {can ? "Disponible" : "Verrouillé"}
                    </Txt>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
