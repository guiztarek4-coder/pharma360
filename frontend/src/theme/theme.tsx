import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AppState } from "react-native";
import { api } from "@/src/lib/api";
import { buildPalette, DEFAULT_PALETTE, Palette } from "./palette";

export const fonts = {
  d400: "Outfit_400Regular",
  d500: "Outfit_500Medium",
  d600: "Outfit_600SemiBold",
  d700: "Outfit_700Bold",
  t400: "PlusJakartaSans_400Regular",
  t500: "PlusJakartaSans_500Medium",
  t600: "PlusJakartaSans_600SemiBold",
  t700: "PlusJakartaSans_700Bold",
};

export function font(family: "display" | "text", weight: 400 | 500 | 600 | 700) {
  const p = family === "display" ? "d" : "t";
  return fonts[`${p}${weight}` as keyof typeof fonts];
}

type Ctx = {
  colors: Palette;
  settings: any;
  loading: boolean;
  refresh: () => Promise<void>;
};

const ThemeCtx = createContext<Ctx>({
  colors: DEFAULT_PALETTE,
  settings: null,
  loading: true,
  refresh: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<any>(null);
  const [colors, setColors] = useState<Palette>(DEFAULT_PALETTE);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const s = await api.get("/settings");
      setSettings(s);
      setColors(buildPalette(s));
    } catch {
      // keep default palette; app still works
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Re-pull settings/theme whenever the app returns to the foreground,
    // so admin changes (theme, footer, hero, fees, loyalty config…) sync.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return <ThemeCtx.Provider value={{ colors, settings, loading, refresh }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
