import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { ThemeProvider } from "@/src/theme/theme";
import { AuthProvider } from "@/src/store/auth";
import { CartProvider } from "@/src/store/cart";
import { FavoritesProvider } from "@/src/store/favorites";

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true);

// Keep the native splash visible from cold start until icon fonts register.
// Required because @expo/vector-icons' componentDidMount fallback fires
// Font.loadAsync against a broken vendor path if any <Icon> mounts before
// the family is registered — which throws on Android Expo Go.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [iconsLoaded, iconsError] = useIconFonts();
  const [appFontsLoaded, appFontsError] = useFonts({
    Outfit_400Regular: require("@/assets/fonts/Outfit_400Regular.ttf"),
    Outfit_500Medium: require("@/assets/fonts/Outfit_500Medium.ttf"),
    Outfit_600SemiBold: require("@/assets/fonts/Outfit_600SemiBold.ttf"),
    Outfit_700Bold: require("@/assets/fonts/Outfit_700Bold.ttf"),
    PlusJakartaSans_400Regular: require("@/assets/fonts/PlusJakartaSans_400Regular.ttf"),
    PlusJakartaSans_500Medium: require("@/assets/fonts/PlusJakartaSans_500Medium.ttf"),
    PlusJakartaSans_600SemiBold: require("@/assets/fonts/PlusJakartaSans_600SemiBold.ttf"),
    PlusJakartaSans_700Bold: require("@/assets/fonts/PlusJakartaSans_700Bold.ttf"),
  });

  const ready = (iconsLoaded || iconsError) && (appFontsLoaded || appFontsError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <FavoritesProvider>
              <CartProvider>
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FAF6EF" } }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="produit/[id]" />
                  <Stack.Screen name="categorie/[id]" />
                  <Stack.Screen name="marque/[id]" />
                  <Stack.Screen name="checkout" />
                  <Stack.Screen name="auth/login" options={{ presentation: "modal" }} />
                  <Stack.Screen name="auth/register" options={{ presentation: "modal" }} />
                  <Stack.Screen name="fidelite" />
                  <Stack.Screen name="commandes" />
                  <Stack.Screen name="pharmacie" />
                  <Stack.Screen name="blog/index" />
                  <Stack.Screen name="blog/[id]" />
                  <Stack.Screen name="order-success" />
                </Stack>
              </CartProvider>
            </FavoritesProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
