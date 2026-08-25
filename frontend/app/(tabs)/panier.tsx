import React from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { Txt, Button, EmptyState, shadowCard } from "@/src/components/ui";
import { useCart } from "@/src/store/cart";
import { formatDA } from "@/src/lib/format";
import { mediaUrl } from "@/src/lib/api";

function QtyStepper({ qty, onDec, onInc }: { qty: number; onDec: () => void; onInc: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceAlt, borderRadius: 10, overflow: "hidden" }}>
      <Pressable testID="qty-dec" onPress={onDec} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
        <Feather name="minus" size={16} color={colors.text} />
      </Pressable>
      <Txt family="display" weight={600} size={14} style={{ minWidth: 22, textAlign: "center" }}>
        {qty}
      </Txt>
      <Pressable testID="qty-inc" onPress={onInc} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
        <Feather name="plus" size={16} color={colors.text} />
      </Pressable>
    </View>
  );
}

export default function Panier() {
  const { colors, settings } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, subtotal, setQty, remove, count } = useCart();

  const deliveryEstimate = settings?.delivery_fee ?? 0;

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ paddingTop: insets.top + 6, paddingBottom: 12, paddingHorizontal: 16 }}>
          <Txt family="display" weight={700} size={22}>
            Mon Panier
          </Txt>
        </View>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState icon="shopping-bag" title="Votre panier est vide" subtitle="Parcourez notre catalogue et ajoutez vos produits préférés." actionLabel="Continuer mes achats" onAction={() => router.push("/catalogue")} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 6, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
        <Txt family="display" weight={700} size={22}>
          Mon Panier
        </Txt>
        <Txt size={13} color={colors.textMuted}>
          {count} article{count > 1 ? "s" : ""}
        </Txt>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 220 }}>
        {items.map((l) => (
          <View key={l.product_id} style={[{ flexDirection: "row", gap: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 10 }, shadowCard]}>
            <Image source={mediaUrl(l.image)} style={{ width: 76, height: 76, borderRadius: 12, backgroundColor: colors.surfaceAlt }} contentFit="cover" />
            <View style={{ flex: 1, justifyContent: "space-between" }}>
              <View>
                {l.brand ? (
                  <Txt weight={600} size={10} color={colors.primary} style={{ textTransform: "uppercase" }}>
                    {l.brand}
                  </Txt>
                ) : null}
                <Txt family="display" weight={600} size={14} numberOfLines={2}>
                  {l.name}
                </Txt>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Txt family="display" weight={700} size={15}>
                  {formatDA(l.price * l.quantity)}
                </Txt>
                <QtyStepper qty={l.quantity} onDec={() => setQty(l.product_id, l.quantity - 1)} onInc={() => setQty(l.product_id, l.quantity + 1)} />
              </View>
            </View>
            <Pressable testID={`remove-${l.product_id}`} onPress={() => remove(l.product_id)} hitSlop={8} style={{ position: "absolute", top: 8, right: 8 }}>
              <Feather name="trash-2" size={16} color={colors.textLight} />
            </Pressable>
          </View>
        ))}

        <View style={[{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10, marginTop: 4 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Txt color={colors.textMuted} size={14}>
              Sous-total
            </Txt>
            <Txt weight={600} size={14}>
              {formatDA(subtotal)}
            </Txt>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Txt color={colors.textMuted} size={14}>
              Livraison (estimée)
            </Txt>
            <Txt weight={600} size={14}>
              {formatDA(deliveryEstimate)}
            </Txt>
          </View>
          <Txt size={11} color={colors.textLight}>
            Frais exacts calculés selon la wilaya à l'étape suivante.
          </Txt>
        </View>
      </ScrollView>

      {/* Sticky checkout bar */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 84 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
          <Txt family="display" weight={600} size={16}>
            Total
          </Txt>
          <Txt family="display" weight={700} size={18} color={colors.primary}>
            {formatDA(subtotal + deliveryEstimate)}
          </Txt>
        </View>
        <Button testID="checkout-btn" title="Passer la commande" icon="arrow-right" size="lg" onPress={() => router.push("/checkout")} />
      </View>
    </View>
  );
}
