import React, { useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, Txt, Button } from "@/src/components/ui";
import { Field } from "@/src/components/Field";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";

export default function Contact() {
  const { colors, settings } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user ? `${user.first_name} ${user.last_name}` : "", email: user?.email || "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.email || !form.message) return setErr("Nom, email et message sont requis.");
    setLoading(true);
    setErr(null);
    try {
      await api.post("/contact", form);
      setDone(true);
    } catch (e: any) {
      setErr(e?.message || "Échec de l'envoi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Contact" onBack={() => router.back()} />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 40 }} bottomOffset={20}>
        {done ? (
          <View style={{ alignItems: "center", padding: 24, gap: 10 }}>
            <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: colors.successSoft, alignItems: "center", justifyContent: "center" }}>
              <Txt size={30}>✅</Txt>
            </View>
            <Txt family="display" weight={700} size={18} center>
              Message envoyé !
            </Txt>
            <Txt size={14} color={colors.textMuted} center>
              Nous vous répondrons dans les plus brefs délais.
            </Txt>
            <Button title="Retour" onPress={() => router.back()} style={{ marginTop: 8, paddingHorizontal: 32 }} />
          </View>
        ) : (
          <>
            <Txt size={14} color={colors.textMuted}>
              Une question ? Écrivez-nous, notre équipe vous répond 7j/7.
            </Txt>
            <Field testID="contact-name" label="Nom" icon="user" value={form.name} onChangeText={set("name")} placeholder="Votre nom" />
            <Field testID="contact-email" label="Email" icon="mail" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={set("email")} placeholder="votre@email.com" />
            <Field testID="contact-subject" label="Sujet" icon="tag" value={form.subject} onChangeText={set("subject")} placeholder="Sujet" />
            <Field testID="contact-message" label="Message" icon="message-square" value={form.message} onChangeText={set("message")} placeholder="Votre message…" multiline style={{ height: 100, textAlignVertical: "top" }} />
            {err ? (
              <Txt size={13} color={colors.danger}>
                {err}
              </Txt>
            ) : null}
            <Button testID="contact-submit" title="Envoyer" icon="send" size="lg" loading={loading} onPress={submit} />
          </>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}
