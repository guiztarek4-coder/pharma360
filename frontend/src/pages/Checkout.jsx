import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, CreditCard, ShoppingBag, Store, MapPin, Tag, Check, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api, { formatDA, formatApiError, mediaUrl } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { WILAYAS } from "@/lib/site";

export default function Checkout() {
  const { items, total, clear } = useCart();
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(settings.payment_cod_enabled ? "cod" : (settings.payment_baridimob_enabled ? "baridimob" : "card"));
  const [deliveryMethod, setDeliveryMethod] = useState("domicile");
  const [submitting, setSubmitting] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [notRobot, setNotRobot] = useState(false);
  const [form, setForm] = useState({
    full_name: user ? `${user.first_name} ${user.last_name}` : "",
    phone: user?.phone || "",
    email: user?.email || "",
    wilaya: "Alger",
    commune: "",
    street: "",
    notes: "",
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    if (user) setForm((f) => ({
      ...f,
      full_name: f.full_name || `${user.first_name} ${user.last_name}`,
      phone: f.phone || user.phone || "",
      email: f.email || user.email || "",
    }));
  }, [user]);

  const deliveryFee = (() => {
    if (deliveryMethod === "pickup" || items.length === 0) return 0;
    if (deliveryMethod === "relais") return settings.relais_fee ?? 350;
    return (settings.delivery_fees && settings.delivery_fees[form.wilaya]) || settings.delivery_fee || 500;
  })();
  const discount = promo ? promo.discount : 0;
  const grandTotal = Math.max(0, total + deliveryFee - discount);

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    try {
      const { data } = await api.post("/promo/validate", { code: promoInput, subtotal: total });
      setPromo(data);
      toast.success(`Code appliqué : -${formatDA(data.discount)}`);
    } catch (err) {
      setPromo(null);
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  if (items.length === 0 && !submitting) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <ShoppingBag className="w-16 h-16 text-mint-200 mx-auto mb-4" />
        <h1 className="font-display font-bold text-2xl mb-2">Votre panier est vide</h1>
        <button onClick={() => navigate("/catalogue")} className="mt-4 px-6 py-3 rounded-full bg-mint-600 text-white font-semibold">Voir le catalogue</button>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.phone) { toast.error("Nom et téléphone requis"); return; }
    if (deliveryMethod !== "pickup" && !form.street) { toast.error("Adresse de livraison requise"); return; }
    if (!acceptTerms) { toast.error("Veuillez accepter la politique de confidentialité et les CGV"); return; }
    if (!notRobot) { toast.error("Veuillez confirmer que vous n'êtes pas un robot"); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post("/orders", {
        items: items.map((i) => ({ product_id: i.product_id, name: i.name, price: i.price, quantity: i.quantity, image: i.image })),
        ...form,
        payment_method: payment,
        delivery_method: deliveryMethod,
        promo_code: promo ? promo.code : "",
      });
      clear();
      if (payment === "baridimob") {
        const num = (settings.whatsapp_number || "").replace(/[^0-9]/g, "");
        const lines = items.map((i) => `• ${i.name} x${i.quantity} = ${formatDA(i.price * i.quantity)}`).join("\n");
        const msg = `Bonjour, je souhaite payer ma commande *Pharma360* par BaridiMob.\n\n*Commande n°* ${data.id}\n*Client* : ${form.full_name}\n*Téléphone* : ${form.phone}\n\n${lines}\n\n*Total à payer* : ${formatDA(data.total)}\n*Livraison* : ${data.delivery_method}${form.street ? `\n*Adresse* : ${form.street}, ${form.commune}, ${form.wilaya}` : ""}`;
        const wa = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
        window.open(wa, "_blank");
      }
      navigate(`/commande/confirmee/${data.id}`, { state: { order: data } });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
      setSubmitting(false);
    }
  };

  const DeliveryOption = ({ id, icon: Icon, title, desc }) => (
    <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${deliveryMethod === id ? "border-mint-500 bg-mint-50" : "border-slate-200"}`} data-testid={`delivery-${id}`}>
      <input type="radio" name="delivery" checked={deliveryMethod === id} onChange={() => setDeliveryMethod(id)} className="accent-mint-600 w-4 h-4" />
      <Icon className="w-5 h-5 text-mint-600 shrink-0" />
      <div className="flex-1"><div className="font-semibold text-sm">{title}</div><div className="text-xs text-slate-500">{desc}</div></div>
    </label>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display font-extrabold text-2xl sm:text-3xl mb-8">Finaliser ma commande</h1>
      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery method */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6">
            <h2 className="font-display font-bold text-lg mb-4">Mode de livraison</h2>
            <div className="space-y-3">
              {settings.pickup_enabled && <DeliveryOption id="pickup" icon={Store} title="Retrait à la pharmacie" desc="Gratuit · Récupérez votre commande sur place" />}
              <DeliveryOption id="domicile" icon={Truck} title="Livraison à domicile" desc={`Selon la wilaya · à partir de ${formatDA(settings.delivery_fee || 500)}`} />
              <DeliveryOption id="relais" icon={MapPin} title="Livraison en point relais" desc={`${formatDA(settings.relais_fee ?? 350)} · Retrait au point relais le plus proche`} />
            </div>
          </div>

          {/* Delivery info */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6">
            <h2 className="font-display font-bold text-lg mb-4">{deliveryMethod === "pickup" ? "Vos coordonnées" : "Informations de livraison"}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nom complet *" value={form.full_name} onChange={set("full_name")} testid="checkout-name" />
              <Field label="Téléphone *" value={form.phone} onChange={set("phone")} testid="checkout-phone" placeholder="05XX XX XX XX" />
              <div className="sm:col-span-2">
                <Field label="Email (pour recevoir la confirmation)" value={form.email} onChange={set("email")} testid="checkout-email" placeholder="votre@email.com" />
              </div>
              {deliveryMethod !== "pickup" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Wilaya *</label>
                    <select value={form.wilaya} onChange={set("wilaya")} data-testid="checkout-wilaya"
                      className="w-full px-4 py-2.5 rounded-xl border border-mint-200 outline-none focus:ring-2 focus:ring-mint-500 bg-white">
                      {WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <Field label="Commune" value={form.commune} onChange={set("commune")} testid="checkout-commune" />
                  <div className="sm:col-span-2">
                    <Field label="Adresse *" value={form.street} onChange={set("street")} testid="checkout-street" placeholder="Rue, quartier, repère..." />
                  </div>
                </>
              )}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Note (optionnel)</label>
                <textarea value={form.notes} onChange={set("notes")} rows={2} data-testid="checkout-notes"
                  className="w-full px-4 py-2.5 rounded-xl border border-mint-200 outline-none focus:ring-2 focus:ring-mint-500" />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6">
            <h2 className="font-display font-bold text-lg mb-4">Mode de paiement</h2>
            <div className="space-y-3">
              {settings.payment_cod_enabled && (
              <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${payment === "cod" ? "border-mint-500 bg-mint-50" : "border-slate-200"}`} data-testid="checkout-payment-cod-radio">
                <input type="radio" name="pay" checked={payment === "cod"} onChange={() => setPayment("cod")} className="accent-mint-600 w-4 h-4" />
                <Truck className="w-5 h-5 text-mint-600" />
                <div><div className="font-semibold text-sm">Paiement en espèces à la livraison</div><div className="text-xs text-slate-500">Payez en espèces à la réception de votre commande</div></div>
              </label>
              )}
              {settings.payment_baridimob_enabled && (
              <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${payment === "baridimob" ? "border-mint-500 bg-mint-50" : "border-slate-200"}`} data-testid="checkout-payment-baridimob-radio">
                <input type="radio" name="pay" checked={payment === "baridimob"} onChange={() => setPayment("baridimob")} className="accent-mint-600 w-4 h-4" />
                <MessageCircle className="w-5 h-5 text-mint-600" />
                <div><div className="font-semibold text-sm">BaridiMob</div><div className="text-xs text-slate-500">Vous serez redirigé vers WhatsApp pour finaliser le paiement</div></div>
              </label>
              )}
              {settings.payment_card_enabled && (
              <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${payment === "card" ? "border-mint-500 bg-mint-50" : "border-slate-200"}`} data-testid="checkout-payment-card-radio">
                <input type="radio" name="pay" checked={payment === "card"} onChange={() => setPayment("card")} className="accent-mint-600 w-4 h-4" />
                <CreditCard className="w-5 h-5 text-mint-600" />
                <div><div className="font-semibold text-sm">Carte CIB / Edahabia <span className="text-[10px] uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded ml-1">Démo</span></div><div className="text-xs text-slate-500">Paiement en ligne simulé (démonstration)</div></div>
              </label>
              )}
            </div>
          </div>

          {/* Mandatory checkboxes */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-3">
            <div data-testid="checkout-accept-terms">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} data-testid="checkout-accept-terms-input" className="accent-mint-600 w-4 h-4 mt-0.5" />
                <span className="text-sm text-slate-600">J'ai lu et j'accepte la politique de confidentialité et les CGV.</span>
              </label>
              <div className="pl-7 mt-1 text-xs">
                <a href="/confidentialite" target="_blank" rel="noreferrer" className="text-mint-700 underline">Lire la politique de confidentialité</a>
                <span className="text-slate-300 mx-2">·</span>
                <a href="/cgv" target="_blank" rel="noreferrer" className="text-mint-700 underline">Lire les CGV</a>
              </div>
            </div>
            <label className="flex items-start gap-3 cursor-pointer" data-testid="checkout-not-robot">
              <input type="checkbox" checked={notRobot} onChange={(e) => setNotRobot(e.target.checked)} className="accent-mint-600 w-4 h-4 mt-0.5" />
              <span className="text-sm text-slate-600 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-mint-600" /> Je ne suis pas un robot</span>
            </label>
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 lg:sticky lg:top-32">
            <h2 className="font-display font-bold text-lg mb-4">Récapitulatif</h2>
            <div className="space-y-3 max-h-56 overflow-auto mb-4">
              {items.map((it) => (
                <div key={it.product_id} className="flex gap-3">
                  <img src={mediaUrl(it.image)} alt="" className="w-12 h-12 rounded-lg object-cover bg-mint-50 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium line-clamp-1">{it.name}</div>
                    <div className="text-xs text-slate-500">{it.quantity} × {formatDA(it.price)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Promo code */}
            <div className="border-t border-mint-100 pt-4 mb-4">
              <label className="block text-sm font-medium text-slate-600 mb-1.5 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Code promo</label>
              <div className="flex gap-2">
                <input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Ex : BIENVENUE10" data-testid="promo-input"
                  className="flex-1 px-3 py-2 rounded-xl border border-mint-200 text-sm outline-none focus:ring-2 focus:ring-mint-500 uppercase" />
                <button type="button" onClick={applyPromo} data-testid="promo-apply" className="px-4 py-2 rounded-xl bg-slate-dark text-white text-sm font-semibold">OK</button>
              </div>
              {promo && <div className="text-xs text-mint-700 mt-1.5 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Code {promo.code} appliqué</div>}
            </div>

            <div className="space-y-2 text-sm border-t border-mint-100 pt-4">
              <div className="flex justify-between"><span className="text-slate-500">Sous-total</span><span data-testid="summary-subtotal">{formatDA(total)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Livraison</span><span data-testid="summary-delivery">{deliveryFee === 0 ? "Gratuit" : formatDA(deliveryFee)}</span></div>
              {discount > 0 && <div className="flex justify-between text-mint-700"><span>Remise</span><span data-testid="summary-discount">- {formatDA(discount)}</span></div>}
              <div className="flex justify-between font-display font-extrabold text-lg pt-2"><span>Total</span><span className="text-mint-700" data-testid="checkout-total">{formatDA(grandTotal)}</span></div>
            </div>
            <button type="submit" disabled={submitting || !acceptTerms || !notRobot} data-testid="checkout-submit"
              className="w-full mt-5 py-3.5 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold shadow-lg shadow-mint-600/30 transition-colors disabled:opacity-50">
              {submitting ? "Traitement…" : payment === "card" ? "Payer maintenant" : payment === "baridimob" ? "Commander et payer via WhatsApp" : "Confirmer la commande"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, testid, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
      <input value={value} onChange={onChange} data-testid={testid} placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl border border-mint-200 outline-none focus:ring-2 focus:ring-mint-500" />
    </div>
  );
}
