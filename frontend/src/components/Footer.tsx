import React from "react";
import { View, Pressable, Linking, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme/theme";
import { Txt } from "@/src/components/ui";

// Resolve a site target path to an in-app route
function resolveTarget(target: string): string {
  if (!target) return "/";
  if (target.startsWith("/page/")) return `/page/${target.split("/page/")[1]}`;
  if (target === "/cgv") return "/cgv";
  if (target === "/confidentialite") return "/confidentialite";
  if (target.startsWith("/catalogue")) return target;
  if (target === "/fidelite") return "/fidelite";
  if (target === "/carte-cadeau") return "/carte-cadeau";
  if (target === "/idees-cadeaux") return "/idees-cadeaux";
  return target;
}

export function Footer() {
  const { colors, settings } = useTheme();
  const router = useRouter();
  if (!settings) return null;

  const help = (settings.footer_help_links || []).filter((l: any) => l.enabled !== false);
  const news = (settings.footer_news_links || []).filter((l: any) => l.enabled !== false);

  const LinkRow = ({ label, target }: { label: string; target: string }) => (
    <Pressable onPress={() => router.push(resolveTarget(target) as any)} style={{ paddingVertical: 7 }}>
      <Txt size={13} color={colors.textMuted}>
        {label}
      </Txt>
    </Pressable>
  );

  const socials: { icon: keyof typeof Feather.glyphMap; url?: string }[] = [
    { icon: "instagram", url: settings.instagram && settings.instagram !== "#" ? `https://instagram.com/${(settings.instagram || "").replace(/[#@]/g, "")}` : undefined },
    { icon: "facebook", url: settings.facebook && settings.facebook !== "#" ? settings.facebook : undefined },
  ];

  return (
    <View style={{ backgroundColor: colors.text, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 28, marginTop: 12 }}>
      <Txt family="display" weight={700} size={20} color="#fff">
        {settings.brand_name || "Pharma360"}
      </Txt>
      <Txt size={13} color="rgba(255,255,255,0.7)" style={{ marginTop: 8, lineHeight: 20 }}>
        {settings.footer_about}
      </Txt>

      <View style={{ flexDirection: "row", gap: 30, marginTop: 20 }}>
        {help.length ? (
          <View style={{ flex: 1 }}>
            <Txt weight={700} size={13} color="#fff" style={{ marginBottom: 4 }}>
              Aide
            </Txt>
            {help.map((l: any) => (
              <FooterLink key={l.id} label={l.label} target={l.target} />
            ))}
          </View>
        ) : null}
        {news.length ? (
          <View style={{ flex: 1 }}>
            <Txt weight={700} size={13} color="#fff" style={{ marginBottom: 4 }}>
              Découvrir
            </Txt>
            {news.map((l: any) => (
              <FooterLink key={l.id} label={l.label} target={l.target} />
            ))}
          </View>
        ) : null}
      </View>

      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 18 }} />

      <View style={{ gap: 8 }}>
        {settings.phone ? (
          <Pressable onPress={() => Linking.openURL(`tel:${settings.phone_link || settings.phone}`)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Feather name="phone" size={14} color="rgba(255,255,255,0.7)" />
            <Txt size={13} color="rgba(255,255,255,0.85)">
              {settings.phone}
            </Txt>
          </Pressable>
        ) : null}
        {settings.address ? (
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <Feather name="map-pin" size={14} color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }} />
            <Txt size={13} color="rgba(255,255,255,0.85)" style={{ flex: 1 }}>
              {settings.address}
            </Txt>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
        {socials
          .filter((s) => s.url)
          .map((s) => (
            <Pressable key={s.icon} onPress={() => Linking.openURL(s.url!)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
              <Feather name={s.icon} size={18} color="#fff" />
            </Pressable>
          ))}
      </View>

      <Txt size={11} color="rgba(255,255,255,0.5)" style={{ marginTop: 20 }}>
        © {new Date().getFullYear()} {settings.brand_name || "Pharma360"} · Tous droits réservés
      </Txt>
    </View>
  );
}

function FooterLink({ label, target }: { label: string; target: string }) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(resolveTarget(target) as any)} style={{ paddingVertical: 6 }}>
      <Txt size={13} color="rgba(255,255,255,0.7)">
        {label}
      </Txt>
    </Pressable>
  );
}
