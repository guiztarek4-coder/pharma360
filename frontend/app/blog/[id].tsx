import React from "react";
import { View, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, Txt, Skeleton, EmptyState } from "@/src/components/ui";
import { useFetch } from "@/src/lib/useFetch";
import { mediaUrl } from "@/src/lib/api";

export default function BlogPost() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // fetch full list and find the post (robust across API shapes)
  const { data, loading, error } = useFetch<any[]>("/blog");
  const post = (data || []).find((p) => p.id === id);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Article" onBack={() => router.back()} />
      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton style={{ height: 200, borderRadius: 18 }} />
          <Skeleton style={{ height: 20, width: "80%" }} />
          <Skeleton style={{ height: 120 }} />
        </View>
      ) : error || !post ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState icon="file-text" title="Article introuvable" actionLabel="Retour" onAction={() => router.back()} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
          <Image source={mediaUrl(post.image)} style={{ width: "100%", height: 230 }} contentFit="cover" transition={200} />
          <View style={{ padding: 16 }}>
            <Txt weight={600} size={12} color={colors.primary}>
              {post.author || "Pharma360"}
            </Txt>
            <Txt family="display" weight={700} size={24} style={{ marginTop: 6, lineHeight: 30 }}>
              {post.title}
            </Txt>
            {post.excerpt ? (
              <Txt size={15} color={colors.textMuted} style={{ marginTop: 10, lineHeight: 22, fontStyle: "italic" }}>
                {post.excerpt}
              </Txt>
            ) : null}
            <Txt size={15} color={colors.text} style={{ marginTop: 16, lineHeight: 24 }}>
              {post.content}
            </Txt>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
