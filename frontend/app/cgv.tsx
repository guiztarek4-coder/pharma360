import React from "react";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme/theme";
import { ContentView } from "@/src/components/ContentView";

export default function CGV() {
  const { settings } = useTheme();
  const router = useRouter();
  return <ContentView title="Conditions Générales de Vente" content={settings?.cgv_content} onBack={() => router.back()} />;
}
