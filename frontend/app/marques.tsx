import React from "react";
import { View, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, Txt, Skeleton, EmptyState } from "@/src/components/ui";
import { useFetch } from "@/src/lib/useFetch";

export default function Marques() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, loading, error, reload } = useFetch<any[]>("/brands");

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Nos Marques" onBack={() => router.back()} subtitle={data ? `${data.length} marques` : undefined} />
      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} style={{ height: 64, borderRadius: 14 }} />
          ))}
        </View>
      ) : error ? (
        <EmptyState icon="wifi-off" title="Erreur" subtitle={error} actionLabel="Réessayer" onAction={reload} />
      ) : (
        <FlatList
          data={data || []}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable testID={`brand-${item.id}`} onPress={() => router.push(`/marque/${item.id}`)} style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: colors.tintSoft, alignItems: "center", justifyContent: "center" }}>
                <Txt family="display" weight={700} size={18} color={colors.primary}>
                  {(item.name || "?").charAt(0)}
                </Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt family="display" weight={600} size={16}>
                  {item.name}
                </Txt>
                {item.description ? (
                  <Txt size={12} color={colors.textMuted} numberOfLines={1}>
                    {item.description}
                  </Txt>
                ) : null}
              </View>
              <Feather name="chevron-right" size={20} color={colors.textLight} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
