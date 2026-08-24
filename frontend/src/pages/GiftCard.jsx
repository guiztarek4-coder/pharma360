import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Check, Mail, Printer } from "lucide-react";
import { formatDA, mediaUrl } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useSettings } from "@/context/SettingsContext";

export default function GiftCard() {
  const { settings } = useSettings();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const amounts = settings.giftcard_amounts && settings.giftcard_amounts.length ? settings.giftcard_amounts : [1000, 2000, 3000, 5000];
  const [mode, setMode] = useState("physical");
  const [amount, setAmount] = useState(amounts[0]);
  // e-card fields
  const [delivery, setDelivery] = useState("email");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendDate, setSendDate] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState("");

  const orderPhysical = () => {
    addItem({ id: `giftcard-${amount}`, name: `Carte cadeau Pharma360 — ${amount} DA`, price: Number(amount), images: settings.giftcard_design ? [settings.giftcard_design] : [], stock: 999 });
    navigate("/commande");
  };

  const orderEcard = () => {
    if (delivery === "email" && !recipientEmail.trim()) { alert("Veuillez saisir l'email du destinataire"); return; }
    addItem({
      id: `ecard-${amount}-${Date.now()}`,
      name: `E-carte cadeau — ${amount} DA`,
      price: Number(amount),
      images: [],
      stock: 999,
      ecard: { delivery, recipient_email: recipientEmail.trim(), message: message.trim(), scheduled_date: sendDate },
    });
    navigate("/commande");
  };

  if (settings.giftcard_enabled === false) {
    return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-slate-400" data-testid="giftcard-disabled">La carte cadeau n'est pas disponible pour le moment.</div>;
  }

  const inputCls = "w-full px-4 py-2.5 rounded-xl border border-mint-200 outline-none focus:ring-2 focus:ring-mint-500 text-sm";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10" data-testid="giftcard-page">
      <h1 className="font-display font-extrabold text-3xl text-center">Cartes cadeaux Pharma360</h1>
      <p className="text-slate-500 mt-2 text-center max-w-2xl mx-auto whitespace-pre-line" data-testid="giftcard-terms">{settings.giftcard_terms}</p>

      {/* Mode toggle */}
      <div className="flex justify-center gap-2 mt-6">
        <button onClick={() => setMode("physical")} data-testid="giftcard-mode-physical" className={`px-5 py-2.5 rounded-full font-semibold text-sm transition-colors ${mode === "physical" ? "bg-mint-600 text-white" : "bg-white border border-mint-200 text-slate-600"}`}>Carte physique</button>
        <button onClick={() => setMode("ecard")} data-testid="giftcard-mode-ecard" className={`px-5 py-2.5 rounded-full font-semibold text-sm transition-colors ${mode === "ecard" ? "bg-mint-600 text-white" : "bg-white border border-mint-200 text-slate-600"}`}>E-carte cadeau</button>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start mt-8">
        <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-mint-600 to-mint-800 aspect-[16/10] grid place-items-center" data-testid="giftcard-design">
          {mode === "physical" && settings.giftcard_design ? (
            <img src={mediaUrl(settings.giftcard_design)} alt="Carte cadeau Pharma360" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-white p-6">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-90" />
              <div className="font-display font-extrabold text-2xl">{mode === "ecard" ? "E-carte cadeau" : "Carte cadeau"}</div>
              <div className="font-display font-extrabold text-lg">Pharma<span className="text-mint-200">360</span></div>
              <div className="mt-3 font-display font-extrabold text-3xl">{formatDA(amount)}</div>
            </div>
          )}
        </div>

        <div>
          <div className="text-sm font-semibold text-slate-600 mb-2">Choisissez un montant</div>
          <div className="flex flex-wrap gap-2" data-testid="giftcard-amounts">
            {amounts.map((a) => (
              <button key={a} onClick={() => setAmount(a)} data-testid={`giftcard-amount-${a}`}
                className={`px-5 py-3 rounded-xl border font-display font-bold transition-colors ${Number(amount) === Number(a) ? "border-mint-600 bg-mint-50 text-mint-700" : "border-slate-200 text-slate-600 hover:border-mint-300"}`}>
                {formatDA(a)}{Number(amount) === Number(a) && <Check className="w-4 h-4 inline ml-1.5" />}
              </button>
            ))}
          </div>

          {mode === "ecard" && (
            <div className="mt-5 space-y-4" data-testid="ecard-form">
              <div>
                <div className="text-sm font-semibold text-slate-600 mb-2">Mode d'envoi</div>
                <div className="flex gap-2">
                  <button onClick={() => setDelivery("email")} data-testid="ecard-delivery-email" className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${delivery === "email" ? "border-mint-600 bg-mint-50 text-mint-700" : "border-slate-200 text-slate-600"}`}><Mail className="w-4 h-4" /> Par email</button>
                  <button onClick={() => setDelivery("print")} data-testid="ecard-delivery-print" className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${delivery === "print" ? "border-mint-600 bg-mint-50 text-mint-700" : "border-slate-200 text-slate-600"}`}><Printer className="w-4 h-4" /> À imprimer</button>
                </div>
              </div>
              {delivery === "email" && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Email du destinataire</label>
                  <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="destinataire@email.com" data-testid="ecard-recipient-email" className={inputCls} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Date d'envoi</label>
                <input type="date" value={sendDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setSendDate(e.target.value)} data-testid="ecard-send-date" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Message personnalisé (optionnel)</label>
                <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Joyeux anniversaire ! ..." data-testid="ecard-message" className={inputCls} />
              </div>
              <button onClick={orderEcard} data-testid="ecard-order-btn" className="w-full flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold shadow-lg shadow-mint-600/30">
                <CreditCard className="w-5 h-5" /> Commander l'E-carte ({formatDA(amount)})
              </button>
              <p className="text-xs text-slate-400">L'E-carte est utilisable en plusieurs fois, jusqu'à épuisement du montant. Elle est envoyée à la date choisie après confirmation de votre commande.</p>
            </div>
          )}

          {mode === "physical" && (
            <div className="mt-6">
              <button onClick={orderPhysical} data-testid="giftcard-order-btn" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold shadow-lg shadow-mint-600/30">
                <CreditCard className="w-5 h-5" /> Commander une carte cadeau physique
              </button>
              <p className="text-xs text-slate-400 mt-3">Paiement à la livraison ou BaridiMob. Livraison partout en Algérie.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
