import React from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, Txt, EmptyState, Button, Skeleton } from "@/src/components/ui";
import { useAuth } from "@/src/store/auth";
import { useFetch } from "@/src/lib/useFetch";
import { formatDA } from "@/src/lib/format";

function statusColor(status: string, colors: any) {
  const s = (status || "").toLowerCase();
  if (s.includes("livr")) return colors.success;
  if (s.includes("annul")) return colors.danger;
  if (s.includes("cours") || s.includes("exped") || s.includes("expéd")) return colors.primary;
  return colors.star;
}

export default function Commandes() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch<any[]>(user ? "/orders/mine" : null, undefined, true);

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Mes commandes" onBack={() => router.back()} />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState icon="lock" title="Connectez-vous" subtitle="Connectez-vous pour consulter l'historique de vos commandes." actionLabel="Se connecter" onAction={() => router.push("/auth/login")} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Mes commandes" onBack={() => router.back()} />
      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 110, borderRadius: 16 }} />
          ))}
        </View>
      ) : error ? (
        <EmptyState icon="wifi-off" title="Erreur" subtitle={error} actionLabel="Réessayer" onAction={reload} />
      ) : (data || []).length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState icon="package" title="Aucune commande" subtitle="Vous n'avez pas encore passé de commande." actionLabel="Découvrir le catalogue" onAction={() => router.push("/catalogue")} />
        </View>
      ) : (
        <FlatList
          data={data || []}
          keyExtractor={(o, i) => o.id || String(i)}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const c = statusColor(item.status, colors);
            const date = item.created_at ? new Date(item.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "";
            const count = (item.items || []).reduce((s: number, l: any) => s + (l.quantity || 0), 0);
            return (
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Txt family="display" weight={700} size={15}>
                    #{String(item.id).slice(-6).toUpperCase()}
                  </Txt>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: c + "22" }}>
                    <Txt size={11} weight={700} color={c}>
                      {item.status}
                    </Txt>
                  </View>
                </View>
                <Txt size={12} color={colors.textLight} style={{ marginTop: 4 }}>
                  {date} · {count} article{count > 1 ? "s" : ""}
                </Txt>
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 10 }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Txt size={13} color={colors.textMuted} numberOfLines={1} style={{ flex: 1 }}>
                    {(item.items || []).map((l: any) => l.name).join(", ")}
                  </Txt>
                  <Txt family="display" weight={700} size={15} color={colors.primary}>
                    {formatDA(item.total)}
                  </Txt>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
