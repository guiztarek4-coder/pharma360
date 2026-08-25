import React, { useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, Pressable, Share } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, Txt, Button } from "@/src/components/ui";
import { useAuth } from "@/src/store/auth";
import { useFetch } from "@/src/lib/useFetch";
import { api, mediaUrl } from "@/src/lib/api";

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
  const { user, refreshUser } = useAuth();
  const loyalty = useFetch<any>(user ? "/loyalty/me" : null, undefined, true);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const tiers: any[] = settings?.loyalty_tiers || [];
  const rewards: any[] = (settings?.loyalty_rewards || []).filter((r: any) => r.enabled !== false);
  const offers: any[] = settings?.loyalty_offers || [];
  const lifetime = loyalty.data?.lifetime ?? user?.loyalty_lifetime ?? 0;
  const points = loyalty.data?.points ?? user?.loyalty_points ?? 0;

  const currentTier = [...tiers].reverse().find((t) => lifetime >= (t.min || 0)) || null;
  const nextTier = tiers.find((t) => (t.min || 0) > lifetime) || null;
  const progress = nextTier ? Math.min(1, lifetime / (nextTier.min || 1)) : 1;

  const refresh = useCallback(async () => {
    await loyalty.reload();
    await refreshUser();
  }, [loyalty, refreshUser]);

  const redeem = async (reward: any) => {
    setBusyId(reward.id);
    setBanner(null);
    try {
      const r = await api.post("/loyalty/redeem", { reward_id: reward.id }, true);
      setBanner({ type: "ok", msg: `Récompense échangée ! Code : ${r.code}` });
      await refresh();
    } catch (e: any) {
      setBanner({ type: "err", msg: e?.message || "Échec de l'échange." });
    } finally {
      setBusyId(null);
    }
  };

  const claimGift = async (tierName: string, gift: any) => {
    setBusyId(gift.id);
    setBanner(null);
    try {
      const r = await api.post("/loyalty/claim-gift", { tier: tierName, gift_id: gift.id }, true);
      setBanner({ type: "ok", msg: `Cadeau réclamé ! Votre code : ${r.code}` });
      await refresh();
    } catch (e: any) {
      setBanner({ type: "err", msg: e?.message || "Impossible de réclamer ce cadeau." });
    } finally {
      setBusyId(null);
    }
  };

  const shareReferral = () => {
    if (!user?.referral_code) return;
    Share.share({ message: `Rejoignez Pharma360 avec mon code de parrainage ${user.referral_code} et gagnez des points ! ${settings?.brand_name || ""}` }).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Programme de fidélité" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: insets.bottom + 30 }}>
        {banner ? (
          <View style={{ backgroundColor: banner.type === "ok" ? colors.successSoft : colors.dangerSoft, borderRadius: 12, padding: 14, flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Feather name={banner.type === "ok" ? "check-circle" : "alert-circle"} size={18} color={banner.type === "ok" ? colors.success : colors.danger} />
            <Txt size={13} weight={600} color={banner.type === "ok" ? colors.success : colors.danger} style={{ flex: 1 }}>
              {banner.msg}
            </Txt>
          </View>
        ) : null}

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
                  <Txt family="display" weight={700} size={20} color="#fff">{points}</Txt>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Txt size={11} color="rgba(255,255,255,0.85)">Points cumulés</Txt>
                  <Txt family="display" weight={700} size={20} color="#fff">{lifetime}</Txt>
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
                <Txt size={12} color="rgba(255,255,255,0.95)" style={{ marginTop: 14 }}>Vous avez atteint le statut maximum 🎉</Txt>
              )}
            </>
          ) : (
            <Button title="Se connecter" style={{ marginTop: 18, backgroundColor: "rgba(255,255,255,0.22)" }} onPress={() => router.push("/auth/login")} />
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

        {/* Exclusive offers */}
        {offers.length ? (
          <View style={{ gap: 12 }}>
            <Txt family="display" weight={700} size={18}>Offres exclusives membres</Txt>
            {offers.map((o: any, i: number) => (
              <View key={i} style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: "row", gap: 12, alignItems: "center" }}>
                <Feather name="star" size={20} color={colors.gold} />
                <View style={{ flex: 1 }}>
                  <Txt family="display" weight={600} size={14}>{o.title || o.label || o.name}</Txt>
                  {o.description ? <Txt size={12} color={colors.textMuted}>{o.description}</Txt> : null}
                </View>
                {o.tier ? <Txt size={11} weight={700} color={colors.primary}>{o.tier}</Txt> : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Tiers with gifts */}
        <View style={{ gap: 12 }}>
          <Txt family="display" weight={700} size={18}>Les statuts & cadeaux</Txt>
          {tiers.map((t) => {
            const key = tierKey(t.name);
            const c = TIER_COLORS[key];
            const unlocked = user && lifetime >= (t.min || 0);
            return (
              <View key={t.name} style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c[0], alignItems: "center", justifyContent: "center" }}>
                    <Feather name="award" size={18} color="#fff" />
                  </View>
                  <Txt family="display" weight={700} size={16} style={{ flex: 1 }}>{t.name}</Txt>
                  <Txt size={12} weight={600} color={unlocked ? colors.success : colors.textMuted}>
                    {unlocked ? "Débloqué" : `dès ${t.min} pts`}
                  </Txt>
                </View>
                {(t.perks || []).map((p: string, i: number) => (
                  <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", marginTop: 4 }}>
                    <Feather name="check" size={15} color={colors.success} style={{ marginTop: 2 }} />
                    <Txt size={13} color={colors.textMuted} style={{ flex: 1, lineHeight: 18 }}>{p}</Txt>
                  </View>
                ))}
                {(t.gifts || []).length ? (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    <Txt weight={600} size={12} color={colors.textMuted}>Cadeaux à choisir :</Txt>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                      {(t.gifts || []).map((g: any) => (
                        <View key={g.id} style={{ width: 130, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: "hidden", backgroundColor: colors.bg }}>
                          {g.image ? <Image source={mediaUrl(g.image)} style={{ width: "100%", height: 90 }} contentFit="cover" /> : null}
                          <View style={{ padding: 8, gap: 6 }}>
                            <Txt size={11} weight={600} numberOfLines={2} style={{ minHeight: 28 }}>{g.name}</Txt>
                            <Pressable
                              testID={`claim-${g.id}`}
                              disabled={!unlocked || busyId === g.id}
                              onPress={() => claimGift(t.name, g)}
                              style={{ borderRadius: 8, paddingVertical: 7, alignItems: "center", backgroundColor: unlocked ? colors.primary : colors.surfaceAlt }}
                            >
                              <Txt size={11} weight={700} color={unlocked ? "#fff" : colors.textLight}>
                                {busyId === g.id ? "..." : unlocked ? "Réclamer" : "Verrouillé"}
                              </Txt>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Rewards */}
        {rewards.length ? (
          <View style={{ gap: 12 }}>
            <Txt family="display" weight={700} size={18}>Récompenses à échanger</Txt>
            {rewards.map((r) => {
              const can = !!user && points >= r.points;
              return (
                <View key={r.id} style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.tintSoft, alignItems: "center", justifyContent: "center" }}>
                    <Feather name="gift" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt family="display" weight={600} size={15}>{r.label}</Txt>
                    <Txt size={12} color={colors.textMuted}>{r.points} points</Txt>
                  </View>
                  <Pressable
                    testID={`redeem-${r.id}`}
                    disabled={!can || busyId === r.id}
                    onPress={() => redeem(r)}
                    style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: can ? colors.primary : colors.surfaceAlt }}
                  >
                    <Txt size={12} weight={700} color={can ? "#fff" : colors.textLight}>
                      {busyId === r.id ? "..." : can ? "Échanger" : "Verrouillé"}
                    </Txt>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Referral */}
        {user && settings?.referral_enabled !== false && user.referral_code ? (
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Feather name="users" size={20} color={colors.primary} />
              <Txt family="display" weight={700} size={16} style={{ flex: 1 }}>Parrainez vos proches</Txt>
            </View>
            <Txt size={13} color={colors.textMuted}>
              Gagnez {settings?.referral_referrer_points ?? 0} points et offrez {settings?.referral_referee_points ?? 0} points à votre filleul.
            </Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
              <View style={{ flex: 1, borderWidth: 1.5, borderColor: colors.primary, borderStyle: "dashed", borderRadius: 12, paddingVertical: 12, alignItems: "center" }}>
                <Txt family="display" weight={700} size={18} color={colors.primary} style={{ letterSpacing: 1 }}>{user.referral_code}</Txt>
              </View>
              <Button title="Partager" icon="share-2" onPress={shareReferral} />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
