import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const SiteContext = createContext(null);

const DEFAULTS = {
  site_name: "L'olivier",
  theme: { preset: "olive", primary: "#3E4E30", primary_hover: "#2E3B23", primary_pale: "#EAF0E6", accent: "#C86D51", gold: "#D4A359" },
  contact: {
    phones: ["0770777685", "0560285199"],
    maps_url: "https://maps.app.goo.gl/G778XwjzYi4cyX8ZA",
    address_label: "Saïd Hamdine — Voir sur Google Maps",
    instagram: "https://www.instagram.com/pharmacie_l.olivier_said_hamdi",
    instagram_handle: "@pharmacie_l.olivier_said_hamdi",
    hours: "7j/7 — 24h/24",
    facebook: "", tiktok: "", whatsapp: "",
  },
};

function applyTheme(theme) {
  const r = document.documentElement.style;
  r.setProperty("--brand", theme.primary);
  r.setProperty("--brand-hover", theme.primary_hover);
  r.setProperty("--brand-pale", theme.primary_pale);
  r.setProperty("--accent", theme.accent);
}

export function SiteProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/settings/public");
      if (data) {
        setSettings({ ...DEFAULTS, ...data, theme: { ...DEFAULTS.theme, ...data.theme }, contact: { ...DEFAULTS.contact, ...data.contact } });
        applyTheme({ ...DEFAULTS.theme, ...data.theme });
      }
    } catch {
      applyTheme(DEFAULTS.theme);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SiteContext.Provider value={{ settings, reloadSettings: load }}>
      {children}
    </SiteContext.Provider>
  );
}

export const useSite = () => useContext(SiteContext);
