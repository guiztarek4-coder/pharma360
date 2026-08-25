import React, { useState } from "react";
import { View, ScrollView, Linking, Platform, Modal, Pressable, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, Txt, Button } from "@/src/components/ui";

function InfoRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value?: string }) {
  const { colors } = useTheme();
  if (!value) return null;
  return (
    <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", paddingVertical: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.tintSoft, alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt size={12} color={colors.textLight}>
          {label}
        </Txt>
        <Txt size={14.5} weight={500} style={{ marginTop: 2, lineHeight: 20 }}>
          {value}
        </Txt>
      </View>
    </View>
  );
}

export default function Pharmacie() {
  const { colors, settings } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tour, setTour] = useState(false);

  const address = settings?.address as string | undefined;
  const tourUrl = settings?.virtual_tour_url as string | undefined;

  const openMaps = () => {
    if (settings?.maps_link) {
      Linking.openURL(settings.maps_link);
      return;
    }
    const q = encodeURIComponent(address || "Pharma360 Alger");
    const url = Platform.select({ ios: `http://maps.apple.com/?q=${q}`, android: `geo:0,0?q=${q}`, default: `https://maps.google.com/?q=${q}` });
    Linking.openURL(url as string);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Notre pharmacie" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        {tourUrl ? (
          <Pressable onPress={() => setTour(true)} style={{ borderRadius: 20, overflow: "hidden", height: 190, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <Feather name="camera" size={40} color="#fff" />
            <Txt family="display" weight={700} size={18} color="#fff" style={{ marginTop: 10 }}>
              Visite Virtuelle 360°
            </Txt>
            <Txt size={13} color="rgba(255,255,255,0.9)" style={{ marginTop: 2 }}>
              Explorez notre pharmacie
            </Txt>
          </Pressable>
        ) : null}

        <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16 }}>
          <InfoRow icon="map-pin" label="Adresse" value={address} />
          <InfoRow icon="clock" label="Horaires" value={settings?.horaires} />
          <InfoRow icon="phone" label="Téléphone" value={settings?.phone} />
          <InfoRow icon="mail" label="Email" value={settings?.email} />
          <InfoRow icon="truck" label="Zone de livraison" value={settings?.delivery_zone} />
        </View>

        <View style={{ gap: 10, marginTop: 20 }}>
          <Button title="Itinéraire" icon="navigation" onPress={openMaps} />
          <Button title="Appeler" icon="phone" variant="outline" onPress={() => Linking.openURL(`tel:${settings?.phone_link || settings?.phone || ""}`)} />
          {settings?.whatsapp_number ? (
            <Button title="WhatsApp" icon="message-circle" variant="outline" onPress={() => Linking.openURL(`https://wa.me/${(settings.whatsapp_number || "").replace(/[^0-9]/g, "")}`)} />
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={tour} animationType="slide" onRequestClose={() => setTour(false)}>
        <View style={{ flex: 1, backgroundColor: "#000", paddingTop: insets.top }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
            <Txt family="display" weight={700} size={17} color="#fff">
              Visite Virtuelle
            </Txt>
            <Pressable testID="close-tour" onPress={() => setTour(false)} hitSlop={10}>
              <Feather name="x" size={26} color="#fff" />
            </Pressable>
          </View>
          {tourUrl ? <WebView source={{ uri: tourUrl }} style={{ flex: 1 }} allowsInlineMediaPlayback /> : null}
        </View>
      </Modal>
    </View>
  );
}
