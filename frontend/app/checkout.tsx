import React, { useMemo, useState, useEffect } from "react";
import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, Button, Txt, Sheet } from "@/src/components/ui";
import { Field } from "@/src/components/Field";
import { useCart } from "@/src/store/cart";
import { useAuth } from "@/src/store/auth";
import { useFetch } from "@/src/lib/useFetch";
import { api } from "@/src/lib/api";
import { formatDA } from "@/src/lib/format";

type Wilaya = { id: string; name: string; code: string; base_fee: number };

export default function Checkout() {
  const { colors, settings } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const wilayas = useFetch<Wilaya[]>("/delivery/wilayas");

  const [fullName, setFullName] = useState(user ? `${user.first_name} ${user.last_name}` : "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [wilaya, setWilaya] = useState<Wilaya | null>(null);
  const [commune, setCommune] = useState("");
  const [street, setStreet] = useState("");
  const [delivery, setDelivery] = useState<"domicile" | "relais">("domicile");
  const [payment, setPayment] = useState<"cod" | "baridimob">("cod");
  const [wilayaSheet, setWilayaSheet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (settings && !settings.payment_cod_enabled && settings.payment_baridimob_enabled) setPayment("baridimob");
  }, [settings]);

  const deliveryFee = useMemo(() => {
    if (delivery === "relais") return settings?.relais_fee ?? 0;
    return wilaya?.base_fee ?? settings?.delivery_fee ?? 0;
  }, [delivery, wilaya, settings]);

  const total = subtotal + deliveryFee;

  const submit = async () => {
    if (!fullName || !phone) return setErr("Nom et téléphone sont obligatoires.");
    if (!wilaya) return setErr("Veuillez choisir votre wilaya.");
    if (delivery === "domicile" && !street) return setErr("Veuillez indiquer votre adresse de livraison.");
    setLoading(true);
    setErr(null);
    try {
      const order = await api.post(
        "/orders",
        {
          items: items.map((l) => ({ product_id: l.product_id, name: l.name, price: l.price, quantity: l.quantity, image: l.image || null })),
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          wilaya: wilaya.name,
          commune: commune.trim(),
          street: street.trim(),
          payment_method: payment,
          delivery_method: delivery,
        },
        !!user
      );
      clear();
      router.replace(`/order-success?id=${order.id}&total=${order.total}&payment=${payment}`);
    } catch (e: any) {
      setErr(e?.message || "La commande n'a pas pu être validée.");
    } finally {
      setLoading(false);
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 }}>
      <Txt family="display" weight={700} size={16}>
        {title}
      </Txt>
      {children}
    </View>
  );

  const OptionTile = ({ active, onPress, icon, title, subtitle, testID }: any) => (
    <Pressable testID={testID} onPress={onPress} style={{ flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.tintSoft : colors.surface, padding: 14, gap: 6 }}>
      <Feather name={icon} size={20} color={active ? colors.primary : colors.textMuted} />
      <Txt family="display" weight={600} size={14} color={active ? colors.primary : colors.text}>
        {title}
      </Txt>
      {subtitle ? (
        <Txt size={11} color={colors.textMuted}>
          {subtitle}
        </Txt>
      ) : null}
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Commande" onBack={() => router.back()} />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} bottomOffset={110} keyboardShouldPersistTaps="handled">
        <Section title="Vos coordonnées">
          <Field testID="co-name" label="Nom complet" icon="user" value={fullName} onChangeText={setFullName} placeholder="Nom et prénom" />
          <Field testID="co-phone" label="Téléphone" icon="phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholder="0X XX XX XX XX" />
          <Field testID="co-email" label="Email (optionnel)" icon="mail" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="votre@email.com" />
        </Section>

        <Section title="Mode de livraison">
          <View style={{ flexDirection: "row", gap: 12 }}>
            <OptionTile testID="delivery-domicile" active={delivery === "domicile"} onPress={() => setDelivery("domicile")} icon="home" title="À domicile" subtitle="Livraison à votre adresse" />
            {settings?.pickup_enabled ? (
              <OptionTile testID="delivery-relais" active={delivery === "relais"} onPress={() => setDelivery("relais")} icon="map-pin" title="Point relais" subtitle={formatDA(settings?.relais_fee ?? 0)} />
            ) : null}
          </View>

          <Pressable testID="co-wilaya" onPress={() => setWilayaSheet(true)} style={{ height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10 }}>
            <Feather name="map" size={18} color={colors.textLight} />
            <Txt size={15} color={wilaya ? colors.text : colors.textLight} style={{ flex: 1 }}>
              {wilaya ? `${wilaya.name} (${formatDA(wilaya.base_fee)})` : "Choisir votre wilaya"}
            </Txt>
            <Feather name="chevron-down" size={18} color={colors.textLight} />
          </Pressable>

          {delivery === "domicile" ? (
            <>
              <Field testID="co-commune" label="Commune" icon="map-pin" value={commune} onChangeText={setCommune} placeholder="Votre commune" />
              <Field testID="co-street" label="Adresse" icon="navigation" value={street} onChangeText={setStreet} placeholder="Rue, quartier, repère…" />
            </>
          ) : null}
        </Section>

        <Section title="Paiement">
          <View style={{ flexDirection: "row", gap: 12 }}>
            {settings?.payment_cod_enabled !== false ? (
              <OptionTile testID="pay-cod" active={payment === "cod"} onPress={() => setPayment("cod")} icon="dollar-sign" title="À la livraison" subtitle="Espèces" />
            ) : null}
            {settings?.payment_baridimob_enabled ? (
              <OptionTile testID="pay-baridimob" active={payment === "baridimob"} onPress={() => setPayment("baridimob")} icon="credit-card" title="BaridiMob" subtitle="Paiement mobile" />
            ) : null}
          </View>
        </Section>

        <Section title="Récapitulatif">
          {items.map((l) => (
            <View key={l.product_id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Txt size={13} color={colors.textMuted} style={{ flex: 1 }} numberOfLines={1}>
                {l.quantity} × {l.name}
              </Txt>
              <Txt size={13} weight={600}>
                {formatDA(l.price * l.quantity)}
              </Txt>
            </View>
          ))}
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 4 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Txt size={14} color={colors.textMuted}>
              Sous-total
            </Txt>
            <Txt size={14} weight={600}>
              {formatDA(subtotal)}
            </Txt>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Txt size={14} color={colors.textMuted}>
              Livraison
            </Txt>
            <Txt size={14} weight={600}>
              {formatDA(deliveryFee)}
            </Txt>
          </View>
        </Section>

        {err ? (
          <Txt size={13} color={colors.danger} testID="co-error">
            {err}
          </Txt>
        ) : null}
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={{ backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <Txt family="display" weight={600} size={16}>
              Total
            </Txt>
            <Txt family="display" weight={700} size={19} color={colors.primary}>
              {formatDA(total)}
            </Txt>
          </View>
          <Button testID="confirm-order-btn" title="Confirmer la commande" size="lg" loading={loading} onPress={submit} />
        </View>
      </KeyboardStickyView>

      <Sheet visible={wilayaSheet} onClose={() => setWilayaSheet(false)} title="Choisir votre wilaya">
        {wilayas.loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          (wilayas.data || []).map((w) => (
            <Pressable
              key={w.id}
              testID={`wilaya-${w.code}`}
              onPress={() => {
                setWilaya(w);
                setWilayaSheet(false);
              }}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
            >
              <Txt size={15} weight={wilaya?.id === w.id ? 700 : 400} color={wilaya?.id === w.id ? colors.primary : colors.text}>
                {w.code} · {w.name}
              </Txt>
              <Txt size={13} color={colors.textMuted}>
                {formatDA(w.base_fee)}
              </Txt>
            </Pressable>
          ))
        )}
      </Sheet>
    </View>
  );
}
