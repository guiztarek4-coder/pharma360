import React from "react";
import { View, ScrollView, Pressable, RefreshControl, TextInput, StyleSheet, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { Txt, Skeleton } from "@/src/components/ui";
import { ProductCard, ProductCardSkeleton, Product } from "@/src/components/ProductCard";
import { useFetch } from "@/src/lib/useFetch";
import { mediaUrl } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { formatDA } from "@/src/lib/format";
import { Footer } from "@/src/components/Footer";

function SectionHeader({ title, emoji, onSeeAll }: { title: string; emoji?: string; onSeeAll?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 12 }}>
      <Txt family="display" weight={700} size={19}>
        {emoji ? emoji + "  " : ""}
        {title}
      </Txt>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Txt weight={600} size={13} color={colors.primary}>
            Voir tout
          </Txt>
          <Feather name="chevron-right" size={16} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Carousel({ products, loading }: { products?: Product[]; loading: boolean }) {
  if (loading) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <ProductCardSkeleton key={i} width={160} />
        ))}
      </ScrollView>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
      {(products || []).map((p) => (
        <ProductCard key={p.id} product={p} width={160} />
      ))}
    </ScrollView>
  );
}

export default function Home() {
  const { colors, settings } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  const promos = useFetch<Product[]>("/products", { on_promo: 1, limit: 8 });
  const news = useFetch<Product[]>("/products", { is_new: 1, limit: 8 });
  const featured = useFetch<Product[]>("/products", { featured: 1, limit: 8 });
  const cats = useFetch<any[]>("/categories");
  const brands = useFetch<any[]>("/brands");
  const blog = useFetch<any[]>("/blog");

  const refreshing = false;
  const onRefresh = () => {
    promos.reload();
    news.reload();
    featured.reload();
  };

  const catW = (width - 16 * 2 - 12 * 2) / 3;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Sticky search header */}
      <View style={{ paddingTop: insets.top + 6, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: colors.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
        {(settings?.top_bar_messages || []).length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 18, alignItems: "center" }}>
            {(settings.top_bar_messages as string[]).map((m, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Feather name="check-circle" size={12} color={colors.primary} />
                <Txt size={11} color={colors.textMuted}>
                  {m}
                </Txt>
              </View>
            ))}
          </ScrollView>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {settings?.logo ? (
            <Image source={mediaUrl(settings.logo)} style={{ width: 40, height: 40, borderRadius: 10 }} contentFit="contain" />
          ) : (
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
              <Txt family="display" weight={700} size={16} color="#fff">
                P
              </Txt>
            </View>
          )}
          <Pressable
            testID="home-search-bar"
            onPress={() => router.push("/catalogue?focus=1")}
            style={{ flex: 1, height: 44, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 8 }}
          >
            <Feather name="search" size={18} color={colors.textLight} />
            <Txt color={colors.textLight} size={14}>
              Rechercher un produit, une marque…
            </Txt>
          </Pressable>
          <Pressable testID="home-notifications" onPress={() => router.push("/notifications")} hitSlop={8} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
            <Feather name="bell" size={19} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
      >
        {/* Hero */}
        <Pressable onPress={() => router.push("/catalogue?on_promo=1")} style={{ margin: 16, borderRadius: 22, overflow: "hidden", height: 210 }}>
          <Image source={mediaUrl(settings?.hero_image)} style={{ ...StyleSheet.absoluteFillObject }} contentFit="cover" transition={250} />
          <LinearGradient colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.72)"]} style={StyleSheet.absoluteFillObject} />
          <View style={{ flex: 1, justifyContent: "flex-end", padding: 18 }}>
            <View style={{ alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 }}>
              <Txt weight={700} size={10} color="#fff" style={{ letterSpacing: 0.5 }}>
                OFFRES DU MOMENT
              </Txt>
            </View>
            <Txt family="display" weight={700} size={22} color="#fff" style={{ lineHeight: 27 }}>
              {settings?.hero_title || "Prenez soin de votre peau & santé"}
            </Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
              <View style={{ backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Txt family="display" weight={700} size={13} color={colors.text}>
                  Découvrir les promos
                </Txt>
                <Feather name="arrow-right" size={15} color={colors.text} />
              </View>
            </View>
          </View>
        </Pressable>

        {/* trust badges */}
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 20 }}>
          {[
            { i: "truck", t: "Livraison Algérie" },
            { i: "credit-card", t: "Paiement livraison" },
            { i: "shield", t: "100% Original" },
          ].map((b) => (
            <View key={b.t} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, alignItems: "center", gap: 6 }}>
              <Feather name={b.i as any} size={18} color={colors.primary} />
              <Txt size={10.5} weight={600} color={colors.textMuted} center>
                {b.t}
              </Txt>
            </View>
          ))}
        </View>

        {/* Loyalty teaser */}
        <Pressable onPress={() => router.push("/fidelite")} style={{ marginHorizontal: 16, marginBottom: 24, borderRadius: 18, overflow: "hidden" }}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
              <Feather name="award" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Txt family="display" weight={700} size={16} color="#fff">
                {user ? `${user.loyalty_points ?? 0} points fidélité` : "Programme de fidélité"}
              </Txt>
              <Txt size={12.5} color="rgba(255,255,255,0.9)" style={{ marginTop: 2 }}>
                {user ? "Bronze · Silver · Gold — voir vos récompenses" : "Gagnez des points à chaque commande"}
              </Txt>
            </View>
            <Feather name="chevron-right" size={22} color="#fff" />
          </LinearGradient>
        </Pressable>

        {/* Nos Offres */}
        <View style={{ marginBottom: 24 }}>
          <SectionHeader title="Nos Offres" emoji="🔥" onSeeAll={() => router.push("/catalogue?on_promo=1")} />
          <Carousel products={promos.data || undefined} loading={promos.loading} />
        </View>

        {/* Categories */}
        <View style={{ marginBottom: 24 }}>
          <SectionHeader title="Catégories" />
          {cats.loading ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16 }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} style={{ width: catW, height: catW }} />
              ))}
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16 }}>
              {(cats.data || []).slice(0, 9).map((c: any) => (
                <Pressable key={c.id} onPress={() => router.push(`/categorie/${c.id}`)} style={{ width: catW, borderRadius: 14, overflow: "hidden", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                  <Image source={mediaUrl(c.image)} style={{ width: "100%", height: catW - 8 }} contentFit="cover" />
                  <View style={{ padding: 8 }}>
                    <Txt weight={600} size={11.5} numberOfLines={1}>
                      {c.label}
                    </Txt>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Nouvel Arrivage */}
        <View style={{ marginBottom: 24 }}>
          <SectionHeader title="Nouvel Arrivage" emoji="✨" onSeeAll={() => router.push("/catalogue?is_new=1")} />
          <Carousel products={news.data || undefined} loading={news.loading} />
        </View>

        {/* Coups de Cœur */}
        <View style={{ marginBottom: 24 }}>
          <SectionHeader title="Nos Coups de Cœur" emoji="💚" onSeeAll={() => router.push("/catalogue?featured=1")} />
          <Carousel products={featured.data || undefined} loading={featured.loading} />
        </View>

        {/* Brands */}
        <View style={{ marginBottom: 24 }}>
          <SectionHeader title="Nos Marques" onSeeAll={() => router.push("/marques")} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {(brands.data || []).map((b: any) => (
              <Pressable key={b.id} onPress={() => router.push(`/marque/${b.id}`)} style={{ paddingHorizontal: 18, height: 48, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
                <Txt family="display" weight={600} size={14}>
                  {b.name}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Gift banners */}
        <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, marginBottom: 24 }}>
          <Pressable onPress={() => router.push("/carte-cadeau")} style={{ flex: 1, borderRadius: 16, overflow: "hidden" }}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={{ padding: 16, height: 110, justifyContent: "space-between" }}>
              <Feather name="gift" size={22} color="#fff" />
              <Txt family="display" weight={700} size={14} color="#fff">
                Cartes cadeaux
              </Txt>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={() => router.push("/idees-cadeaux")} style={{ flex: 1, borderRadius: 16, overflow: "hidden", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 16, height: 110, justifyContent: "space-between" }}>
            <Feather name="package" size={22} color={colors.primary} />
            <Txt family="display" weight={700} size={14}>
              Idées cadeaux
            </Txt>
          </Pressable>
        </View>

        {/* Blog */}
        <View style={{ marginBottom: 8 }}>
          <SectionHeader title="Conseils & Astuces" onSeeAll={() => router.push("/blog")} />
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {(blog.data || []).slice(0, 3).map((post: any) => (
              <Pressable key={post.id} onPress={() => router.push(`/blog/${post.id}`)} style={{ flexDirection: "row", gap: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
                <Image source={mediaUrl(post.image)} style={{ width: 96, height: 96 }} contentFit="cover" />
                <View style={{ flex: 1, paddingVertical: 10, paddingRight: 12, justifyContent: "center" }}>
                  <Txt weight={600} size={10} color={colors.primary}>
                    {post.author || "Pharma360"}
                  </Txt>
                  <Txt family="display" weight={600} size={14} numberOfLines={2} style={{ marginTop: 2, lineHeight: 18 }}>
                    {post.title}
                  </Txt>
                  <Txt size={12} color={colors.textMuted} numberOfLines={1} style={{ marginTop: 3 }}>
                    {post.excerpt}
                  </Txt>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <Footer />
      </ScrollView>
    </View>
  );
}
