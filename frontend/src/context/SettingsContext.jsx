import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

const SettingsContext = createContext(null);
export const useSettings = () => useContext(SettingsContext);

// --- Theme palette generation from a 2-color preset (accent + background) ---
function hexToRgb(hex) {
  const h = (hex || "#000000").replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}
function hslStr(h, s, l) { return `${h} ${s}% ${l}%`; }
function hslHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => { const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return Math.round(255 * c); };
  const toHex = (v) => v.toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
function applyPresetVars(root, accent, bg) {
  const [ar, ag, ab] = hexToRgb(accent);
  let [h, s] = rgbToHsl(ar, ag, ab);
  s = Math.min(95, Math.max(45, s + 12)); // boost saturation for vivid accents/buttons
  const scale = { 100: 92, 200: 84, 300: 74, 400: 63, 500: 52, 600: 43, 700: 35, 800: 27, 900: 20 };
  root.style.setProperty("--mint-50", bg || hslHex(h, s, 96));
  Object.entries(scale).forEach(([k, l]) => root.style.setProperty(`--mint-${k}`, hslHex(h, s, l)));
  root.style.setProperty("--primary", hslStr(h, s, 43));
  root.style.setProperty("--ring", hslStr(h, s, 43));
}


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

  // Apply theme: seasonal CSS classes OR a custom 2-color preset (computed palette)
  useEffect(() => {
    const root = document.documentElement;
    const seasonFromDate = () => {
      const m = new Date().getMonth() + 1;
      if (m >= 3 && m <= 5) return "spring";
      if (m >= 6 && m <= 8) return "summer";
      if (m >= 9 && m <= 11) return "autumn";
      return "winter";
    };
    const seasons = ["spring", "summer", "autumn", "winter"];
    const mintVars = ["--mint-50","--mint-100","--mint-200","--mint-300","--mint-400","--mint-500","--mint-600","--mint-700","--mint-800","--mint-900","--primary","--ring"];
    const clearInline = () => mintVars.forEach((v) => root.style.removeProperty(v));
    const clearClasses = () => ["theme-spring","theme-summer","theme-autumn","theme-winter","theme-rose","theme-mauve","theme-gold","theme-noir"].forEach((c) => root.classList.remove(c));

    const mode = settings.theme_mode || "auto";
    const active = mode === "manual" ? (settings.theme_manual || "spring") : seasonFromDate();

    if (seasons.includes(active)) {
      clearInline();
      clearClasses();
      root.classList.add(`theme-${active}`);
      return;
    }
    // custom preset
    const preset = (settings.theme_presets || []).find((p) => p.id === active);
    if (preset) {
      clearClasses();
      applyPresetVars(root, preset.accent, preset.bg);
    } else {
      // fallback
      clearInline();
      clearClasses();
      root.classList.add("theme-spring");
    }
  }, [settings.theme_mode, settings.theme_manual, JSON.stringify(settings.theme_presets)]);


  return (
    <SettingsContext.Provider value={{ settings, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
};
