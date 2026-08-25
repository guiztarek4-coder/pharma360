import React, { useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "@/src/components/KeyboardAware";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, Button, Txt } from "@/src/components/ui";
import { Field } from "@/src/components/Field";
import { useAuth } from "@/src/store/auth";
import { useGoBack } from "@/src/lib/useGoBack";

export default function Register() {
  const { colors } = useTheme();
  const router = useRouter();
  const goBack = useGoBack();
  const { register } = useAuth();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.phone || !form.password) {
      setErr("Veuillez remplir tous les champs.");
      return;
    }
    if (form.password.length < 6) {
      setErr("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      await register({ ...form, email: form.email.trim(), phone: form.phone.trim() });
      goBack();
    } catch (e: any) {
      setErr(e?.message || "Impossible de créer le compte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Créer un compte" onBack={goBack} />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: 16, gap: 14 }} bottomOffset={20} keyboardShouldPersistTaps="handled">
        <Txt size={14} color={colors.textMuted} style={{ marginBottom: 2 }}>
          Rejoignez Pharma360 et profitez du programme de fidélité.
        </Txt>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field testID="reg-first" label="Prénom" value={form.first_name} onChangeText={set("first_name")} placeholder="Prénom" />
          </View>
          <View style={{ flex: 1 }}>
            <Field testID="reg-last" label="Nom" value={form.last_name} onChangeText={set("last_name")} placeholder="Nom" />
          </View>
        </View>
        <Field testID="reg-email" label="Email" icon="mail" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={set("email")} placeholder="votre@email.com" />
        <Field testID="reg-phone" label="Téléphone" icon="phone" keyboardType="phone-pad" value={form.phone} onChangeText={set("phone")} placeholder="0X XX XX XX XX" />
        <Field testID="reg-password" label="Mot de passe" icon="lock" secure value={form.password} onChangeText={set("password")} placeholder="Au moins 6 caractères" />

        {err ? (
          <Txt size={13} color={colors.danger} testID="reg-error">
            {err}
          </Txt>
        ) : null}

        <Button testID="reg-submit" title="Créer mon compte" size="lg" loading={loading} onPress={submit} style={{ marginTop: 4 }} />

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 4 }}>
          <Txt size={14} color={colors.textMuted}>
            Déjà un compte ?
          </Txt>
          <Txt testID="go-login" size={14} weight={700} color={colors.primary} onPress={() => router.replace("/auth/login")}>
            Se connecter
          </Txt>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
