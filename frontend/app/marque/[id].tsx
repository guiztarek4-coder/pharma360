import React from "react";
import { View, FlatList, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, EmptyState } from "@/src/components/ui";
import { ProductCard, ProductCardSkeleton, Product } from "@/src/components/ProductCard";
import { useFetch } from "@/src/lib/useFetch";

export default function BrandScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();

  const brand = useFetch<any>(id ? `/brands/${id}` : null);
  const name = brand.data?.name;
  const { data, loading, error, reload } = useFetch<Product[]>(name ? "/products" : null, { brand: name, limit: 100 });
  const cardW = (width - 16 * 2 - 12) / 2;
  const busy = brand.loading || loading;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={name || "Marque"} onBack={() => router.back()} subtitle={data ? `${data.length} produits` : undefined} />
      {busy ? (
        <FlatList
          data={[0, 1, 2, 3]}
          keyExtractor={(i) => String(i)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingTop: 16, gap: 12 }}
          renderItem={() => <ProductCardSkeleton width={cardW} />}
        />
      ) : error ? (
        <EmptyState icon="wifi-off" title="Erreur" subtitle={error} actionLabel="Réessayer" onAction={reload} />
      ) : (data || []).length === 0 ? (
        <EmptyState icon="inbox" title="Aucun produit" subtitle="Aucun produit pour cette marque." actionLabel="Voir le catalogue" onAction={() => router.push("/catalogue")} />
      ) : (
        <FlatList
          data={data || []}
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
