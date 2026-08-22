import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Check } from "lucide-react";
import { formatDA, mediaUrl } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useSettings } from "@/context/SettingsContext";

export default function GiftCard() {
  const { settings } = useSettings();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const amounts = settings.giftcard_amounts && settings.giftcard_amounts.length ? settings.giftcard_amounts : [1000, 2000, 3000, 5000];
  const [amount, setAmount] = useState(amounts[0]);

  const order = () => {
    addItem({ id: `giftcard-${amount}`, name: `Carte cadeau Pharma360 — ${amount} DA`, price: Number(amount), images: settings.giftcard_design ? [settings.giftcard_design] : [], stock: 999 });
    navigate("/commande");
  };

  if (settings.giftcard_enabled === false) {
    return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-slate-400" data-testid="giftcard-disabled">La carte cadeau n'est pas disponible pour le moment.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10" data-testid="giftcard-page">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-mint-600 to-mint-800 aspect-[16/10] grid place-items-center" data-testid="giftcard-design">
          {settings.giftcard_design ? (
            <img src={mediaUrl(settings.giftcard_design)} alt="Carte cadeau Pharma360" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-white p-6">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-90" />
              <div className="font-display font-extrabold text-2xl">Carte cadeau</div>
              <div className="font-display font-extrabold text-lg">Pharma<span className="text-mint-200">360</span></div>
            </div>
          )}
        </div>
        <div>
          <h1 className="font-display font-extrabold text-3xl">Carte cadeau physique</h1>
          <p className="text-slate-500 mt-2 whitespace-pre-line" data-testid="giftcard-terms">{settings.giftcard_terms}</p>

          <div className="mt-6">
            <div className="text-sm font-semibold text-slate-600 mb-2">Choisissez un montant</div>
            <div className="flex flex-wrap gap-2" data-testid="giftcard-amounts">
              {amounts.map((a) => (
                <button key={a} onClick={() => setAmount(a)} data-testid={`giftcard-amount-${a}`}
                  className={`px-5 py-3 rounded-xl border font-display font-bold transition-colors ${Number(amount) === Number(a) ? "border-mint-600 bg-mint-50 text-mint-700" : "border-slate-200 text-slate-600 hover:border-mint-300"}`}>
                  {formatDA(a)}
                  {Number(amount) === Number(a) && <Check className="w-4 h-4 inline ml-1.5" />}
                </button>
              ))}
            </div>
          </div>

          <button onClick={order} data-testid="giftcard-order-btn" className="mt-6 w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold shadow-lg shadow-mint-600/30">
            <CreditCard className="w-5 h-5" /> Commander une carte cadeau physique
          </button>
          <p className="text-xs text-slate-400 mt-3">Paiement à la livraison ou BaridiMob. Livraison partout en Algérie.</p>
        </div>
      </div>
    </div>
  );
}
