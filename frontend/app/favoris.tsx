import React, { useMemo } from "react";
import { View, FlatList, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, EmptyState, Skeleton } from "@/src/components/ui";
import { ProductCard, Product } from "@/src/components/ProductCard";
import { useFetch } from "@/src/lib/useFetch";
import { useFavorites } from "@/src/store/favorites";

export default function Favoris() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { ids } = useFavorites();
  const { data, loading } = useFetch<Product[]>(ids.length ? "/products" : null, { limit: 300 });
  const cardW = (width - 16 * 2 - 12) / 2;

  const favProducts = useMemo(() => (data || []).filter((p) => ids.includes(p.id)), [data, ids]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Mes favoris" onBack={() => router.back()} subtitle={ids.length ? `${ids.length} produit${ids.length > 1 ? "s" : ""}` : undefined} />
      {ids.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState icon="heart" title="Aucun favori" subtitle="Ajoutez des produits à vos favoris en appuyant sur le cœur." actionLabel="Parcourir le catalogue" onAction={() => router.push("/catalogue")} />
        </View>
      ) : loading ? (
        <View style={{ padding: 16 }}>
          <Skeleton style={{ height: 200 }} />
        </View>
      ) : (
        <FlatList
          data={favProducts}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingTop: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <ProductCard product={item} width={cardW} />}
        />
      )}
    </View>
  );
}
