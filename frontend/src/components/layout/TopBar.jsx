import { Truck, ShieldCheck, Zap, Phone } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

export default function TopBar() {
  const { settings } = useSettings();
  const items = [
    { icon: Truck, text: "Livraison rapide à Alger" },
    { icon: ShieldCheck, text: "Produits 100% Originaux & Authentiques" },
    { icon: Zap, text: "Expédition Express sous 24h–48h" },
    { icon: Phone, text: `Conseils & Service Client : ${settings.phone}` },
  ];
  const row = [...items, ...items];
  return (
    <div className="bg-mint-900 text-mint-100 text-xs sm:text-[13px] overflow-hidden" data-testid="top-reassurance-bar">
      <div className="flex whitespace-nowrap animate-marquee py-2 w-max">
        {row.map((it, i) => (
          <span key={i} className="flex items-center gap-2 px-6 shrink-0">
            <it.icon className="w-3.5 h-3.5 text-mint-300" />
            {it.text}
          </span>
        ))}
      </div>
    </div>
  );
}
