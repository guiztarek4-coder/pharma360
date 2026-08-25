import React, { useState } from "react";
import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, Txt, Button, EmptyState, Sheet } from "@/src/components/ui";
import { Field } from "@/src/components/Field";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useFetch } from "@/src/lib/useFetch";

export default function Adresses() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading, reload } = useFetch<any[]>(user ? "/account/addresses" : null, undefined, true);
  const wilayas = useFetch<any[]>("/delivery/wilayas");

  const [sheet, setSheet] = useState(false);
  const [wilayaSheet, setWilayaSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: user ? `${user.first_name} ${user.last_name}` : "", phone: user?.phone || "", wilaya: "Alger", commune: "", street: "" });
  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Mes adresses" onBack={() => router.back()} />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState icon="lock" title="Connectez-vous" subtitle="Connectez-vous pour gérer vos adresses." actionLabel="Se connecter" onAction={() => router.push("/auth/login")} />
        </View>
      </View>
    );
  }

  const save = async () => {
    if (!form.full_name || !form.phone || !form.street) return;
    setSaving(true);
    try {
      await api.post("/account/addresses", form, true);
      setSheet(false);
      setForm({ full_name: `${user.first_name} ${user.last_name}`, phone: user.phone || "", wilaya: "Alger", commune: "", street: "" });
      reload();
    } catch {}
    finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.del(`/account/addresses/${id}`);
      reload();
    } catch {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Mes adresses" onBack={() => router.back()} right={<Pressable testID="add-address" onPress={() => setSheet(true)} hitSlop={8}><Feather name="plus-circle" size={24} color={colors.primary} /></Pressable>} />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (data || []).length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState icon="map-pin" title="Aucune adresse" subtitle="Ajoutez une adresse de livraison." actionLabel="Ajouter une adresse" onAction={() => setSheet(true)} />
        </View>
      ) : (
        <View style={{ padding: 16, gap: 12 }}>
          {(data || []).map((a) => (
            <View key={a.id} style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: "row", gap: 12 }}>
              <Feather name="map-pin" size={20} color={colors.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Txt family="display" weight={600} size={15}>
                  {a.full_name}
                </Txt>
                <Txt size={13} color={colors.textMuted} style={{ marginTop: 2 }}>
                  {a.street}, {a.commune ? `${a.commune}, ` : ""}{a.wilaya}
                </Txt>
                <Txt size={13} color={colors.textMuted}>
                  {a.phone}
                </Txt>
              </View>
              <Pressable testID={`del-address-${a.id}`} onPress={() => remove(a.id)} hitSlop={8}>
                <Feather name="trash-2" size={18} color={colors.textLight} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Nouvelle adresse">
        <View style={{ gap: 12 }}>
          <Field testID="addr-name" label="Nom complet" icon="user" value={form.full_name} onChangeText={set("full_name")} placeholder="Nom et prénom" />
          <Field testID="addr-phone" label="Téléphone" icon="phone" keyboardType="phone-pad" value={form.phone} onChangeText={set("phone")} placeholder="0X XX XX XX XX" />
          <View style={{ gap: 6 }}>
            <Txt weight={600} size={13} color={colors.textMuted}>Wilaya</Txt>
            <Pressable onPress={() => setWilayaSheet(true)} style={{ height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10 }}>
              <Feather name="map" size={18} color={colors.textLight} />
              <Txt size={15} style={{ flex: 1 }}>{form.wilaya}</Txt>
              <Feather name="chevron-down" size={18} color={colors.textLight} />
            </Pressable>
          </View>
          <Field testID="addr-commune" label="Commune" icon="map-pin" value={form.commune} onChangeText={set("commune")} placeholder="Commune" />
          <Field testID="addr-street" label="Adresse" icon="navigation" value={form.street} onChangeText={set("street")} placeholder="Rue, quartier, repère…" />
          <Button testID="save-address" title="Enregistrer" loading={saving} onPress={save} style={{ marginTop: 4 }} />
        </View>
      </Sheet>

      <Sheet visible={wilayaSheet} onClose={() => setWilayaSheet(false)} title="Choisir la wilaya">
        {(wilayas.data || []).map((w: any) => (
          <Pressable key={w.id} onPress={() => { setForm((f) => ({ ...f, wilaya: w.name })); setWilayaSheet(false); }} style={{ paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
            <Txt size={15}>{w.code} · {w.name}</Txt>
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}
