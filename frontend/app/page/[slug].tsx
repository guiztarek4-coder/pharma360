import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/src/theme/theme";
import { ContentView } from "@/src/components/ContentView";
import { ScreenHeader, EmptyState } from "@/src/components/ui";
import { useFetch } from "@/src/lib/useFetch";

export default function DynamicPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, loading, error } = useFetch<any>(slug ? `/pages/${slug}` : null);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Page" onBack={() => router.back()} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Page" onBack={() => router.back()} />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState icon="file-text" title="Page introuvable" actionLabel="Retour" onAction={() => router.back()} />
        </View>
      </View>
    );
  }
  return <ContentView title={data.title || "Page"} content={data.content} onBack={() => router.back()} />;
}
