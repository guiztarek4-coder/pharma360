import React from "react";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme/theme";
import { ContentView } from "@/src/components/ContentView";

export default function Confidentialite() {
  const { settings } = useTheme();
  const router = useRouter();
  return <ContentView title="Confidentialité" content={settings?.privacy_content} onBack={() => router.back()} />;
}
