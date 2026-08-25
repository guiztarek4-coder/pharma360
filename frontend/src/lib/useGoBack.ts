import { useRouter } from "expo-router";
import { useCallback } from "react";

// Safe back: if there is nothing to go back to (e.g. deep-linked directly),
// fall back to the home tabs instead of firing an unhandled GO_BACK.
export function useGoBack() {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }, [router]);
}
