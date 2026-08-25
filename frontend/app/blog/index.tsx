import React from "react";
import { View, FlatList } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, Txt, EmptyState, Skeleton, shadowCard } from "@/src/components/ui";
import { useFetch } from "@/src/lib/useFetch";
import { mediaUrl } from "@/src/lib/api";
import { Pressable } from "react-native";

export default function BlogList() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, loading, error, reload } = useFetch<any[]>("/blog");

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Conseils & Astuces" onBack={() => router.back()} />
      {loading ? (
        <View style={{ padding: 16, gap: 14 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 220, borderRadius: 18 }} />
          ))}
        </View>
      ) : error ? (
        <EmptyState icon="wifi-off" title="Erreur" subtitle={error} actionLabel="Réessayer" onAction={reload} />
      ) : (
        <FlatList
          data={data || []}
          keyExtractor={(p, i) => p.id || String(i)}
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/blog/${item.id}`)} style={[{ backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }, shadowCard]}>
              <Image source={mediaUrl(item.image)} style={{ width: "100%", height: 170 }} contentFit="cover" transition={200} />
              <View style={{ padding: 14 }}>
                <Txt weight={600} size={11} color={colors.primary}>
                  {item.author || "Pharma360"}
                </Txt>
                <Txt family="display" weight={700} size={16} style={{ marginTop: 4, lineHeight: 21 }} numberOfLines={2}>
                  {item.title}
                </Txt>
                <Txt size={13} color={colors.textMuted} style={{ marginTop: 4, lineHeight: 19 }} numberOfLines={2}>
                  {item.excerpt}
                </Txt>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
