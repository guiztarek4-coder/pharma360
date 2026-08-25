import React from "react";
import { View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/theme";
import { ScreenHeader, Txt } from "@/src/components/ui";

export function ContentView({ title, content, onBack }: { title: string; content?: string; onBack: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={title} onBack={onBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 30 }}>
        <Txt size={15} color={colors.text} style={{ lineHeight: 24 }}>
          {content || "Contenu à venir."}
        </Txt>
      </ScrollView>
    </View>
  );
}
