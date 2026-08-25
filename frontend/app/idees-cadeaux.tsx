import React from "react";
import { View, ScrollView, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, Txt, Skeleton } from "@/src/components/ui";
import { ProductCard } from "@/src/components/ProductCard";
import { useFetch } from "@/src/lib/useFetch";
import { mediaUrl } from "@/src/lib/api";

export default function IdeesCadeaux() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { data, loading } = useFetch<any>("/gift-ideas");
  const cardW = (width - 16 * 2 - 12) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Idées cadeaux" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: insets.bottom + 30 }}>
        {loading ? (
          <Skeleton style={{ height: 60 }} />
        ) : (
          <>
            {data?.intro ? (
              <Txt size={15} color={colors.textMuted} style={{ lineHeight: 22 }}>
                {data.intro}
              </Txt>
            ) : null}

            {(data?.packs || []).length ? (
              <View style={{ gap: 12 }}>
                <Txt family="display" weight={700} size={18}>
                  Nos coffrets
                </Txt>
                {(data.packs || []).map((p: any, i: number) => (
                  <View key={i} style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden", flexDirection: "row" }}>
                    {p.image ? <Image source={mediaUrl(p.image)} style={{ width: 100, height: 100 }} contentFit="cover" /> : null}
                    <View style={{ flex: 1, padding: 12, justifyContent: "center" }}>
                      <Txt family="display" weight={600} size={15}>
                        {p.name}
                      </Txt>
                      {p.description ? (
                        <Txt size={12} color={colors.textMuted} numberOfLines={2} style={{ marginTop: 2 }}>
                          {p.description}
                        </Txt>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {(data?.featured || []).length ? (
              <View style={{ gap: 12 }}>
                <Txt family="display" weight={700} size={18}>
                  Nos sélections
                </Txt>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  {(data.featured || []).map((p: any) => (
                    <ProductCard key={p.id} product={p} width={cardW} />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
