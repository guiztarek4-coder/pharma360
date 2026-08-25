import React, { useEffect } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, Txt, EmptyState, Skeleton } from "@/src/components/ui";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useFetch } from "@/src/lib/useFetch";

export default function Notifications() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading } = useFetch<any>(user ? "/notifications" : null, undefined, true);

  useEffect(() => {
    if (user) api.post("/notifications/read", {}, true).catch(() => {});
  }, [user]);

  const list: any[] = Array.isArray(data) ? data : data?.notifications || [];

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Notifications" onBack={() => router.back()} />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState icon="lock" title="Connectez-vous" subtitle="Connectez-vous pour voir vos notifications." actionLabel="Se connecter" onAction={() => router.push("/auth/login")} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Notifications" onBack={() => router.back()} />
      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 70, borderRadius: 14 }} />
          ))}
        </View>
      ) : list.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState icon="bell" title="Aucune notification" subtitle="Vous êtes à jour !" />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(n, i) => n.id || String(i)}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => (
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: "row", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.tintSoft, alignItems: "center", justifyContent: "center" }}>
                <Feather name="bell" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                {item.title ? (
                  <Txt family="display" weight={600} size={14}>
                    {item.title}
                  </Txt>
                ) : null}
                <Txt size={13} color={colors.textMuted} style={{ marginTop: 2 }}>
                  {item.message || item.body || item.text}
                </Txt>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
