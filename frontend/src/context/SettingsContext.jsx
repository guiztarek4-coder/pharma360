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
  address: "Adresse à définir, Alger, Algérie",
  horaires: "7j/7 — 08h00 à 22h00",
  facebook: "#",
  instagram: "#",
  tiktok: "#",
  delivery_zone: "Alger uniquement",
  delivery_fee: 500,
  payment_cod_enabled: true,
  payment_card_enabled: true,
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

  return (
    <SettingsContext.Provider value={{ settings, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
};
