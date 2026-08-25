import React, { useMemo } from "react";
import { View, FlatList, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, EmptyState } from "@/src/components/ui";
import { ProductCard, ProductCardSkeleton, Product } from "@/src/components/ProductCard";
import { useFetch } from "@/src/lib/useFetch";

function findLabel(tree: any[] | null, id?: string): string | undefined {
  if (!tree || !id) return undefined;
  for (const n of tree) {
    if (n.id === id) return n.label;
    const c = findLabel(n.children || [], id);
    if (c) return c;
  }
  return undefined;
}

export default function CategoryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();

  const cats = useFetch<any[]>("/categories");
  const { data, loading, error, reload } = useFetch<Product[]>(id ? "/products" : null, { category_id: id, limit: 100 });
  const label = useMemo(() => findLabel(cats.data, id) || "Catégorie", [cats.data, id]);
  const cardW = (width - 16 * 2 - 12) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={label} onBack={() => router.back()} subtitle={data ? `${data.length} produits` : undefined} />
      {loading ? (
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
        <EmptyState icon="inbox" title="Aucun produit" subtitle="Cette catégorie est vide pour le moment." actionLabel="Voir le catalogue" onAction={() => router.push("/catalogue")} />
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
