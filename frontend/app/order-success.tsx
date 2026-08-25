import React from "react";
import { View, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { Txt, Button } from "@/src/components/ui";
import { useAuth } from "@/src/store/auth";
import { formatDA } from "@/src/lib/format";

export default function OrderSuccess() {
  const { colors, settings } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { id, total, payment } = useLocalSearchParams<{ id: string; total: string; payment: string }>();

  const shortId = id ? String(id).slice(-6).toUpperCase() : "";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={{ width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <Feather name="check" size={48} color="#fff" />
        </LinearGradient>
        <Txt family="display" weight={700} size={24} center>
          Commande confirmée !
        </Txt>
        <Txt size={15} color={colors.textMuted} center style={{ marginTop: 8, lineHeight: 22 }}>
          Merci pour votre confiance. Nous préparons votre commande et vous contacterons pour la livraison.
        </Txt>

        <View style={{ marginTop: 24, alignSelf: "stretch", backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Txt color={colors.textMuted}>N° de commande</Txt>
            <Txt weight={700}>#{shortId}</Txt>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Txt color={colors.textMuted}>Total</Txt>
            <Txt weight={700} color={colors.primary}>
              {formatDA(Number(total || 0))}
            </Txt>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Txt color={colors.textMuted}>Paiement</Txt>
            <Txt weight={600}>{payment === "baridimob" ? "BaridiMob" : "À la livraison"}</Txt>
          </View>
        </View>

        {payment === "baridimob" && settings?.whatsapp_number ? (
          <Button
            title="Envoyer le reçu sur WhatsApp"
            icon="message-circle"
            variant="outline"
            style={{ marginTop: 16, alignSelf: "stretch" }}
            onPress={() => Linking.openURL(`https://wa.me/${(settings.whatsapp_number || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Bonjour, paiement BaridiMob commande #${shortId}`)}`)}
          />
        ) : null}
      </View>

      <View style={{ padding: 16, paddingBottom: insets.bottom + 16, gap: 10 }}>
        {user ? <Button title="Suivre ma commande" variant="outline" onPress={() => router.replace("/commandes")} /> : null}
        <Button testID="continue-shopping" title="Continuer mes achats" size="lg" onPress={() => router.replace("/(tabs)")} />
      </View>
    </View>
  );
}
