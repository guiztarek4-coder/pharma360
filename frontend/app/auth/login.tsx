import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, Button, Txt } from "@/src/components/ui";
import { Field } from "@/src/components/Field";
import { useAuth } from "@/src/store/auth";
import { useGoBack } from "@/src/lib/useGoBack";

export default function Login() {
  const { colors } = useTheme();
  const router = useRouter();
  const goBack = useGoBack();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!identifier || !password) {
      setErr("Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      await login(identifier.trim(), password);
      goBack();
    } catch (e: any) {
      setErr(e?.message || "Identifiants incorrects.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Connexion" onBack={goBack} />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: 16, gap: 16 }} bottomOffset={20} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", marginVertical: 12 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.tintSoft, alignItems: "center", justifyContent: "center" }}>
            <Txt family="display" weight={700} size={26} color={colors.primary}>
              P
            </Txt>
          </View>
          <Txt family="display" weight={700} size={22} style={{ marginTop: 14 }}>
            Bon retour 👋
          </Txt>
          <Txt size={14} color={colors.textMuted} center style={{ marginTop: 4 }}>
            Connectez-vous à votre compte Pharma360
          </Txt>
        </View>

        <Field testID="login-identifier" label="Email ou téléphone" icon="mail" autoCapitalize="none" keyboardType="email-address" value={identifier} onChangeText={setIdentifier} placeholder="votre@email.com" />
        <Field testID="login-password" label="Mot de passe" icon="lock" secure value={password} onChangeText={setPassword} placeholder="••••••••" />

        {err ? (
          <Txt size={13} color={colors.danger} testID="login-error">
            {err}
          </Txt>
        ) : null}

        <Button testID="login-submit" title="Se connecter" size="lg" loading={loading} onPress={submit} style={{ marginTop: 4 }} />

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 }}>
          <Txt size={14} color={colors.textMuted}>
            Pas encore de compte ?
          </Txt>
          <Txt testID="go-register" size={14} weight={700} color={colors.primary} onPress={() => router.replace("/auth/register")}>
            Créer un compte
          </Txt>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
