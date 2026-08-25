import React, { useMemo, useState, useEffect, useRef } from "react";
import { View, ScrollView, TextInput, Pressable, FlatList, StyleSheet, useWindowDimensions, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { Txt, Chip, EmptyState } from "@/src/components/ui";
import { ProductCard, ProductCardSkeleton, Product } from "@/src/components/ProductCard";
import { useFetch } from "@/src/lib/useFetch";

export default function Catalogue() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string; on_promo?: string; is_new?: string; featured?: string; category_id?: string; brand?: string; q?: string }>();
  const { width } = useWindowDimensions();
  const inputRef = useRef<TextInput>(null);

  const [search, setSearch] = useState((params.q as string) || "");
  const [debounced, setDebounced] = useState(search);
  const [activeCat, setActiveCat] = useState<string | null>((params.category_id as string) || null);

  const cats = useFetch<any[]>("/categories");

  const flags = {
    on_promo: params.on_promo ? 1 : undefined,
    is_new: params.is_new ? 1 : undefined,
    featured: params.featured ? 1 : undefined,
    brand: (params.brand as string) || undefined,
  };

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (params.focus) {
      const t = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [params.focus]);

  const query = useMemo(
    () => ({ ...flags, search: debounced || undefined, category_id: activeCat || undefined, limit: 100 }),
    [debounced, activeCat, params.on_promo, params.is_new, params.featured, params.brand]
  );

  const { data, loading, error, reload } = useFetch<Product[]>("/products", query);

  const cardW = (width - 16 * 2 - 12) / 2;
  const topCats = (cats.data || []).filter((c: any) => c.level === 0 || c.parent_id == null);

  const title = params.on_promo ? "Nos Offres" : params.is_new ? "Nouveautés" : params.featured ? "Coups de Cœur" : "Catalogue";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Sticky header: search + chips */}
      <View style={{ paddingTop: insets.top + 6, backgroundColor: colors.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          <Txt family="display" weight={700} size={22} style={{ marginBottom: 10 }}>
            {title}
          </Txt>
          <View style={{ height: 46, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 8 }}>
            <Feather name="search" size={18} color={colors.textLight} />
            <TextInput
              ref={inputRef}
              testID="catalogue-search-input"
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher un produit, une marque…"
              placeholderTextColor={colors.textLight}
              returnKeyType="search"
              style={{ flex: 1, fontFamily: "PlusJakartaSans_400Regular", fontSize: 14, color: colors.text, paddingVertical: 0 }}
            />
            {search ? (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Feather name="x" size={18} color={colors.textLight} />
              </Pressable>
            ) : null}
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}>
          <Chip label="Tout" active={!activeCat} onPress={() => setActiveCat(null)} testID="chip-all" />
          {topCats.map((c: any) => (
            <Chip key={c.id} label={c.label} active={activeCat === c.id} onPress={() => setActiveCat(activeCat === c.id ? null : c.id)} testID={`chip-${c.slug}`} />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <FlatList
          data={[0, 1, 2, 3, 4, 5]}
          keyExtractor={(i) => String(i)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingTop: 16, gap: 12, paddingBottom: insets.bottom + 90 }}
          renderItem={() => <ProductCardSkeleton width={cardW} />}
        />
      ) : error ? (
        <EmptyState icon="wifi-off" title="Erreur de chargement" subtitle={error} actionLabel="Réessayer" onAction={reload} />
      ) : (data || []).length === 0 ? (
        <EmptyState icon="search" title="Aucun produit trouvé" subtitle="Essayez d'autres mots-clés ou réinitialisez les filtres." actionLabel="Réinitialiser" onAction={() => { setSearch(""); setActiveCat(null); }} />
      ) : (
        <FlatList
          testID="catalogue-list"
          data={data || []}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingTop: 16, gap: 12, paddingBottom: insets.bottom + 90 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <ProductCard product={item} width={cardW} />}
          ListHeaderComponent={<Txt size={13} color={colors.textMuted} style={{ paddingHorizontal: 16, marginBottom: 4 }}>{(data || []).length} produits</Txt>}
        />
      )}
    </View>
  );
}
