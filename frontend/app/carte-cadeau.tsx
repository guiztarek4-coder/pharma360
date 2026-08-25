import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, Txt, Button } from "@/src/components/ui";
import { Field } from "@/src/components/Field";
import { useCart } from "@/src/store/cart";
import { mediaUrl } from "@/src/lib/api";
import { formatDA } from "@/src/lib/format";

export default function CarteCadeau() {
  const { colors, settings } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { add } = useCart();

  const amounts: number[] = settings?.giftcard_amounts || [1000, 2000, 3000, 5000];
  const [amount, setAmount] = useState<number>(amounts[0]);
  const [mode, setMode] = useState<"email" | "print">("email");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");

  if (settings && settings.giftcard_enabled === false) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Carte cadeau" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Txt color={colors.textMuted} center>
            Les cartes cadeaux ne sont pas disponibles pour le moment.
          </Txt>
        </View>
      </View>
    );
  }

  const addToCart = () => {
    add({
      product_id: `giftcard-${amount}`,
      name: `Carte cadeau Pharma360 — ${amount} DA`,
      price: Number(amount),
      image: settings?.giftcard_design || undefined,
      stock: 999,
      ecard: { delivery: mode, recipient_email: recipient.trim(), message: message.trim() },
    });
    router.push("/panier");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Carte cadeau" onBack={() => router.back()} />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: insets.bottom + 40 }} bottomOffset={20}>
        {/* Preview card */}
        <View style={{ borderRadius: 20, overflow: "hidden", height: 180, backgroundColor: colors.primary, justifyContent: "flex-end" }}>
          {settings?.giftcard_design ? <Image source={mediaUrl(settings.giftcard_design)} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="cover" /> : null}
          <View style={{ padding: 18, backgroundColor: "rgba(0,0,0,0.25)" }}>
            <Txt family="display" weight={700} size={14} color="#fff">
              CARTE CADEAU
            </Txt>
            <Txt family="display" weight={700} size={30} color="#fff">
              {formatDA(amount)}
            </Txt>
          </View>
        </View>

        {settings?.gift_intro ? (
          <Txt size={14} color={colors.textMuted} style={{ lineHeight: 20 }}>
            {settings.gift_intro}
          </Txt>
        ) : null}

        <View>
          <Txt family="display" weight={700} size={16} style={{ marginBottom: 10 }}>
            Choisir le montant
          </Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {amounts.map((a) => (
              <Pressable key={a} testID={`giftcard-amount-${a}`} onPress={() => setAmount(a)} style={{ paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: amount === a ? colors.primary : colors.border, backgroundColor: amount === a ? colors.tintSoft : colors.surface }}>
                <Txt family="display" weight={700} size={15} color={amount === a ? colors.primary : colors.text}>
                  {formatDA(a)}
                </Txt>
              </Pressable>
            ))}
          </View>
        </View>

        <View>
          <Txt family="display" weight={700} size={16} style={{ marginBottom: 10 }}>
            Livraison
          </Txt>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable testID="giftcard-mode-email" onPress={() => setMode("email")} style={{ flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: mode === "email" ? colors.primary : colors.border, backgroundColor: mode === "email" ? colors.tintSoft : colors.surface, padding: 14, gap: 6 }}>
              <Feather name="mail" size={20} color={mode === "email" ? colors.primary : colors.textMuted} />
              <Txt weight={600} size={14} color={mode === "email" ? colors.primary : colors.text}>
                Par email
              </Txt>
            </Pressable>
            <Pressable testID="giftcard-mode-print" onPress={() => setMode("print")} style={{ flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: mode === "print" ? colors.primary : colors.border, backgroundColor: mode === "print" ? colors.tintSoft : colors.surface, padding: 14, gap: 6 }}>
              <Feather name="printer" size={20} color={mode === "print" ? colors.primary : colors.textMuted} />
              <Txt weight={600} size={14} color={mode === "print" ? colors.primary : colors.text}>
                À imprimer
              </Txt>
            </Pressable>
          </View>
        </View>

        {mode === "email" ? <Field testID="giftcard-recipient" label="Email du destinataire" icon="mail" autoCapitalize="none" keyboardType="email-address" value={recipient} onChangeText={setRecipient} placeholder="destinataire@email.com" /> : null}
        <Field testID="giftcard-message" label="Message (optionnel)" icon="edit-2" value={message} onChangeText={setMessage} placeholder="Un petit mot…" />

        <Button testID="giftcard-order-btn" title="Ajouter au panier" icon="gift" size="lg" onPress={addToCart} />
      </KeyboardAwareScrollView>
    </View>
  );
}
