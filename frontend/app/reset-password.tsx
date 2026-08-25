import React, { useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "@/src/components/KeyboardAware";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, Txt, Button } from "@/src/components/ui";
import { Field } from "@/src/components/Field";
import { api } from "@/src/lib/api";
import { useGoBack } from "@/src/lib/useGoBack";

export default function ResetPassword() {
  const { colors } = useTheme();
  const router = useRouter();
  const goBack = useGoBack();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const forgot = async () => {
    if (!email.trim()) return setErr("Entrez votre email.");
    setLoading(true);
    setErr(null);
    try {
      const r = await api.post("/auth/forgot-password", { email: email.trim() });
      setMsg(r?.message || "Si un compte existe, un email vous a été envoyé.");
    } catch (e: any) {
      setErr(e?.message || "Échec.");
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    if (password.length < 6) return setErr("Mot de passe trop court (min 6).");
    if (password !== confirm) return setErr("Les mots de passe ne correspondent pas.");
    setLoading(true);
    setErr(null);
    try {
      await api.post("/auth/reset-password", { token, password });
      setMsg("Mot de passe réinitialisé ! Vous pouvez vous connecter.");
      setTimeout(() => router.replace("/auth/login"), 1500);
    } catch (e: any) {
      setErr(e?.message || "Lien invalide ou expiré.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={token ? "Nouveau mot de passe" : "Mot de passe oublié"} onBack={goBack} />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: 16, gap: 16 }} bottomOffset={20}>
        {token ? (
          <>
            <Txt size={14} color={colors.textMuted}>
              Choisissez un nouveau mot de passe.
            </Txt>
            <Field testID="rp-password" label="Nouveau mot de passe" icon="lock" secure value={password} onChangeText={setPassword} placeholder="••••••••" />
            <Field testID="rp-confirm" label="Confirmer" icon="lock" secure value={confirm} onChangeText={setConfirm} placeholder="••••••••" />
            <Button testID="rp-submit" title="Réinitialiser" size="lg" loading={loading} onPress={reset} />
          </>
        ) : (
          <>
            <Txt size={14} color={colors.textMuted}>
              Entrez votre email pour recevoir un lien de réinitialisation.
            </Txt>
            <Field testID="fp-email" label="Email" icon="mail" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="votre@email.com" />
            <Button testID="fp-submit" title="Envoyer le lien" size="lg" loading={loading} onPress={forgot} />
          </>
        )}
        {msg ? (
          <Txt size={13} color={colors.success}>
            {msg}
          </Txt>
        ) : null}
        {err ? (
          <Txt size={13} color={colors.danger}>
            {err}
          </Txt>
        ) : null}
      </KeyboardAwareScrollView>
    </View>
  );
}
