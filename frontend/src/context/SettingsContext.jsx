import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

const SettingsContext = createContext(null);
export const useSettings = () => useContext(SettingsContext);

const DEFAULTS = {
  brand_name: "Pharma360",
  tagline: "Votre Parapharmacie en Ligne en Algérie",
  logo: null,
  phone: "0500 00 00 00",
  phone_link: "+213500000000",
  email: "contact@pharma360-dz.com",
  sender_email: "onboarding@resend.dev",
  address: "Adresse à définir, Alger, Algérie",
  horaires: "7j/7 — 08h00 à 22h00",
  facebook: "#",
  instagram: "#",
  tiktok: "#",
  delivery_zone: "Toutes les wilayas d'Algérie",
  delivery_fee: 500,
  relais_fee: 350,
  delivery_fees: {},
  pickup_enabled: true,
  payment_cod_enabled: true,
  payment_card_enabled: true,
  hero_image: null,
  hero_title: "Prenez soin de votre peau & santé au meilleur prix",
  hero_subtitle: "Cosmétiques et soins 100% originaux, livrés partout en Algérie. Payez à la livraison, en toute confiance.",
  top_bar_messages: [
    "Livraison rapide dans toutes les wilayas d'Algérie",
    "Produits 100% Originaux & Authentiques",
    "Expédition Express sous 24h–48h",
  ],
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULTS);

  const refresh = async () => {
    try {
      const { data } = await api.get("/settings");
      setSettings({ ...DEFAULTS, ...data });
    } catch {}
  };

  useEffect(() => { refresh(); }, []);

  // Apply seasonal theme class to <html>
  useEffect(() => {
    const seasonFromDate = () => {
      const m = new Date().getMonth() + 1; // 1-12
      if (m >= 3 && m <= 5) return "spring";
      if (m >= 6 && m <= 8) return "summer";
      if (m >= 9 && m <= 11) return "autumn";
      return "winter";
    };
    const mode = settings.theme_mode || "auto";
    const active = mode === "manual" ? (settings.theme_manual || "spring") : seasonFromDate();
    const root = document.documentElement;
    ["theme-spring", "theme-summer", "theme-autumn", "theme-winter"].forEach((c) => root.classList.remove(c));
    root.classList.add(`theme-${active}`);
  }, [settings.theme_mode, settings.theme_manual]);

  return (
    <SettingsContext.Provider value={{ settings, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
};
