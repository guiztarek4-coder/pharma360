import { Truck, ShieldCheck, Zap, Phone } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

const ICONS = [Truck, ShieldCheck, Zap, Phone];

export default function TopBar() {
  const { settings } = useSettings();
  const msgs = (settings.top_bar_messages && settings.top_bar_messages.length ? settings.top_bar_messages : [
    "Livraison rapide dans toutes les wilayas d'Algérie",
    "Produits 100% Originaux & Authentiques",
    "Expédition Express sous 24h–48h",
  ]);
  const items = [...msgs, `Service Client : ${settings.phone}`];
  const row = [...items, ...items];
  return (
    <div className="bg-mint-900 text-mint-100 text-xs sm:text-[13px] overflow-hidden" data-testid="top-reassurance-bar">
      <div className="flex whitespace-nowrap animate-marquee py-2 w-max">
        {row.map((txt, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <span key={i} className="flex items-center gap-2 px-6 shrink-0">
              <Icon className="w-3.5 h-3.5 text-mint-300" />
              {txt}
            </span>
          );
        })}
      </div>
    </div>
  );
}
