import React, { useState } from "react";
import { View, ScrollView, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/src/theme/theme";
import { Txt, Button, EmptyState, Skeleton, shadowCard } from "@/src/components/ui";
import { ProductCard, Product } from "@/src/components/ProductCard";
import { useFetch } from "@/src/lib/useFetch";
import { api, mediaUrl } from "@/src/lib/api";
import { formatDA, discountPct } from "@/src/lib/format";
import { useCart } from "@/src/store/cart";
import { useFavorites } from "@/src/store/favorites";
import { useGoBack } from "@/src/lib/useGoBack";

export default function ProductDetail() {
  const { colors, settings } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const goBack = useGoBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { add } = useCart();
  const { isFav, toggle } = useFavorites();

  const { data: product, loading, error, reload } = useFetch<Product & { description?: string; category_id?: string; complementary_ids?: string[] }>(id ? `/products/${id}` : null);
  const [imgIdx, setImgIdx] = useState(0);
  const [added, setAdded] = useState(false);

  const compQuery = product?.category_id ? { category_id: product.category_id, limit: 6 } : { featured: 1, limit: 6 };
  const related = useFetch<Product[]>(product ? "/products" : null, compQuery);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Skeleton style={{ width: "100%", height: width, borderRadius: 0 }} />
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton style={{ height: 20, width: "70%" }} />
          <Skeleton style={{ height: 24, width: "40%" }} />
          <Skeleton style={{ height: 80, width: "100%" }} />
        </View>
      </View>
    );
  }
  if (error || !product) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center" }}>
        <EmptyState icon="alert-circle" title="Produit introuvable" subtitle={error || undefined} actionLabel="Retour" onAction={() => router.back()} />
      </View>
    );
  }

  const images = (product.images || []).length ? product.images! : [""];
  const pct = discountPct(product.price, product.old_price);
  const out = (product.stock ?? 0) <= 0;
  const lowStock = !out && (product.stock ?? 0) <= (settings?.low_stock_threshold ?? 5);
  const fav = isFav(product.id);
  const relatedList = (related.data || []).filter((p) => p.id !== product.id).slice(0, 6);

  const onAdd = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    add({ product_id: product.id, name: product.name, price: product.price, image: images[0], brand: product.brand, stock: product.stock });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Floating back / fav */}
      <View style={{ position: "absolute", top: insets.top + 6, left: 16, right: 16, zIndex: 10, flexDirection: "row", justifyContent: "space-between" }}>
        <Pressable testID="header-back" onPress={goBack} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" }}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Pressable testID="detail-fav" onPress={() => toggle(product.id)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" }}>
          <Feather name="heart" size={20} color={fav ? colors.danger : colors.text} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        {/* Gallery */}
        <View style={{ backgroundColor: colors.surfaceAlt }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {images.map((im, i) => (
              <Image key={i} source={mediaUrl(im)} style={{ width, height: width }} contentFit="cover" transition={200} />
            ))}
          </ScrollView>
          {images.length > 1 ? (
            <View style={{ position: "absolute", bottom: 12, alignSelf: "center", flexDirection: "row", gap: 6 }}>
              {images.map((_, i) => (
                <View key={i} style={{ width: i === imgIdx ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === imgIdx ? colors.primary : "rgba(0,0,0,0.2)" }} />
              ))}
            </View>
          ) : null}
        </View>

        <View style={{ padding: 16 }}>
          {product.brand ? (
            <Txt weight={700} size={12} color={colors.primary} style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
              {product.brand}
            </Txt>
          ) : null}
          <Txt family="display" weight={700} size={22} style={{ marginTop: 4, lineHeight: 28 }}>
            {product.name}
          </Txt>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
            <Txt family="display" weight={700} size={26} color={colors.text}>
              {formatDA(product.price)}
            </Txt>
            {product.old_price && product.old_price > product.price ? (
              <Txt size={16} color={colors.textLight} style={{ textDecorationLine: "line-through" }}>
                {formatDA(product.old_price)}
              </Txt>
            ) : null}
            {pct ? (
              <View style={{ backgroundColor: colors.danger, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Txt family="display" weight={700} size={12} color="#fff">{`-${pct}%`}</Txt>
              </View>
            ) : null}
          </View>

          {/* stock + loyalty */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: out ? colors.dangerSoft : colors.successSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 }}>
              <Feather name={out ? "x-circle" : "check-circle"} size={14} color={out ? colors.danger : colors.success} />
              <Txt weight={600} size={12} color={out ? colors.danger : colors.success}>
                {out ? "En rupture" : lowStock ? `Plus que ${product.stock} en stock` : "En stock"}
              </Txt>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.tintSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 }}>
              <Feather name="award" size={14} color={colors.primary} />
              <Txt weight={600} size={12} color={colors.primary}>
                +{Math.round((product.price / 100) * (settings?.loyalty_points_per_100da ?? 1))} pts
              </Txt>
            </View>
          </View>

          {product.description ? (
            <View style={{ marginTop: 22 }}>
              <Txt family="display" weight={700} size={16} style={{ marginBottom: 6 }}>
                Description
              </Txt>
              <Txt size={14} color={colors.textMuted} style={{ lineHeight: 21 }}>
                {product.description}
              </Txt>
            </View>
          ) : null}
        </View>

        {relatedList.length ? (
          <View style={{ marginTop: 8 }}>
            <Txt family="display" weight={700} size={18} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              Vous aimerez aussi
            </Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {relatedList.map((p) => (
                <ProductCard key={p.id} product={p} width={150} />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky add-to-cart */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View>
          <Txt size={11} color={colors.textMuted}>
            Prix
          </Txt>
          <Txt family="display" weight={700} size={19} color={colors.primary}>
            {formatDA(product.price)}
          </Txt>
        </View>
        <Button
          testID="add-to-cart-btn"
          title={out ? "Indisponible" : added ? "Ajouté au panier ✓" : "Ajouter au panier"}
          icon={out ? undefined : added ? undefined : "shopping-bag"}
          disabled={out}
          onPress={onAdd}
          size="lg"
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}
