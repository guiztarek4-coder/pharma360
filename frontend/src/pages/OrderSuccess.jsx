import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { CheckCircle2, Package, Phone } from "lucide-react";
import api, { formatDA } from "@/lib/api";
import { useSettings } from "@/context/SettingsContext";

export default function OrderSuccess() {
  const { id } = useParams();
  const location = useLocation();
  const { settings } = useSettings();
  const [order, setOrder] = useState(location.state?.order || null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center animate-fade-up">
      <div className="w-20 h-20 rounded-full bg-mint-100 grid place-items-center mx-auto mb-6">
        <CheckCircle2 className="w-11 h-11 text-mint-600" />
      </div>
      <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-dark" data-testid="order-success-title">Commande confirmée !</h1>
      <p className="text-slate-500 mt-3">Merci pour votre confiance. Nous vous contacterons bientôt pour confirmer la livraison.</p>

      {order && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 mt-8 text-left">
          <div className="flex items-center justify-between pb-4 border-b border-mint-100">
            <div><div className="text-xs text-slate-400 font-mono-label">N° Commande</div><div className="font-semibold">#{id.slice(-8).toUpperCase()}</div></div>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">{order.status}</span>
          </div>
          <div className="py-4 space-y-2">
            {order.items?.map((it, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-600">{it.quantity} × {it.name}</span>
                <span className="font-medium">{formatDA(it.price * it.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-mint-100 pt-4 space-y-1 text-sm">
            <div className="flex justify-between text-slate-500"><span>Livraison ({order.wilaya})</span><span>{formatDA(order.delivery)}</span></div>
            <div className="flex justify-between font-display font-extrabold text-lg"><span>Total</span><span className="text-mint-700">{formatDA(order.total)}</span></div>
            <div className="text-xs text-slate-400 mt-2">Paiement : {order.payment_method === "card" ? "Carte (démo)" : "À la livraison"}</div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 justify-center mt-8">
        <Link to="/catalogue" className="px-6 py-3 rounded-full bg-mint-600 text-white font-semibold hover:bg-mint-700">Continuer mes achats</Link>
        <Link to="/compte" className="px-6 py-3 rounded-full border border-mint-200 font-semibold flex items-center gap-2"><Package className="w-4 h-4" /> Mes commandes</Link>
      </div>
      <a href={`tel:${settings.phone_link}`} className="inline-flex items-center gap-2 mt-6 text-sm text-slate-500"><Phone className="w-4 h-4 text-mint-600" /> Une question ? {settings.phone}</a>
    </div>
  );
}
