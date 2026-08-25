import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme/theme";
import { Txt, shadowCard } from "@/src/components/ui";
import { formatDA, discountPct } from "@/src/lib/format";
import { mediaUrl } from "@/src/lib/api";
import { useCart } from "@/src/store/cart";
import { useFavorites } from "@/src/store/favorites";
import { useMemberPricing } from "@/src/store/memberPricing";
import * as Haptics from "expo-haptics";

export type Product = {
  id: string;
  name: string;
  brand?: string;
  price: number;
  old_price?: number | null;
  stock?: number;
  images?: string[];
  badge?: string | null;
  is_new?: boolean;
};

export function ProductCard({ product, width }: { product: Product; width?: number }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { add } = useCart();
  const { isFav, toggle } = useFavorites();
  const { getMemberPrice } = useMemberPricing();
  const member = getMemberPrice(product);
  const pct = discountPct(product.price, product.old_price);
  const out = (product.stock ?? 0) <= 0;
  const img = mediaUrl(product.images?.[0]);
  const fav = isFav(product.id);

  return (
    <Pressable
      testID={`product-card-${product.id}`}
      onPress={() => router.push(`/produit/${product.id}`)}
      style={[{ width, backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.border }, shadowCard]}
    >
      <View style={{ backgroundColor: colors.surfaceAlt }}>
        <Image source={img} style={{ width: "100%", aspectRatio: 1 }} contentFit="cover" transition={200} />
        <View style={{ position: "absolute", top: 8, left: 8, flexDirection: "row", gap: 6 }}>
          {pct ? (
            <View style={{ backgroundColor: colors.danger, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }}>
              <Txt family="display" weight={700} size={11} color="#fff">{`-${pct}%`}</Txt>
            </View>
          ) : null}
          {product.is_new && !pct ? (
            <View style={{ backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }}>
              <Txt family="display" weight={700} size={10} color="#fff">NOUVEAU</Txt>
            </View>
          ) : null}
        </View>
        <Pressable
          testID={`fav-${product.id}`}
          onPress={(e) => {
            e.stopPropagation();
            toggle(product.id);
          }}
          hitSlop={8}
          style={{ position: "absolute", top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" }}
        >
          <Feather name="heart" size={16} color={fav ? colors.danger : colors.textMuted} style={{ opacity: fav ? 1 : 0.9 }} />
        </Pressable>
        {out ? (
          <View style={{ position: "absolute", bottom: 8, left: 8, backgroundColor: colors.text, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Txt family="display" weight={600} size={10} color="#fff">Rupture</Txt>
          </View>
        ) : null}
      </View>

      <View style={{ padding: 10, gap: 3 }}>
        {product.brand ? (
          <Txt weight={600} size={10} color={colors.primary} numberOfLines={1} style={{ textTransform: "uppercase", letterSpacing: 0.4 }}>
            {product.brand}
          </Txt>
        ) : null}
        <Txt family="display" weight={500} size={13} numberOfLines={2} style={{ minHeight: 34, lineHeight: 17 }}>
          {product.name}
        </Txt>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 2 }}>
          <View style={{ flex: 1 }}>
            <Txt family="display" weight={700} size={15} color={member ? colors.primary : colors.text}>
              {formatDA(member ? member.price : product.price)}
            </Txt>
            {member ? (
              <Txt size={11} color={colors.textLight} style={{ textDecorationLine: "line-through" }}>
                {formatDA(member.original)}
              </Txt>
            ) : product.old_price && product.old_price > product.price ? (
              <Txt size={11} color={colors.textLight} style={{ textDecorationLine: "line-through" }}>
                {formatDA(product.old_price)}
              </Txt>
            ) : null}
          </View>
          {!out ? (
            <Pressable
              testID={`add-cart-${product.id}`}
              onPress={(e) => {
                e.stopPropagation();
                Haptics.selectionAsync().catch(() => {});
                add({ product_id: product.id, name: product.name, price: product.price, image: product.images?.[0], brand: product.brand, stock: product.stock });
              }}
              style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}
            >
              <Feather name="plus" size={18} color="#fff" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function ProductCardSkeleton({ width }: { width?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ width, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
      <View style={{ width: "100%", aspectRatio: 1, backgroundColor: colors.surfaceAlt }} />
      <View style={{ padding: 10, gap: 8 }}>
        <View style={{ height: 10, width: "40%", backgroundColor: colors.surfaceAlt, borderRadius: 4 }} />
        <View style={{ height: 12, width: "90%", backgroundColor: colors.surfaceAlt, borderRadius: 4 }} />
        <View style={{ height: 14, width: "55%", backgroundColor: colors.surfaceAlt, borderRadius: 4 }} />
      </View>
    </View>
  );
}
