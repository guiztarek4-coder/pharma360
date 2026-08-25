import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, XCircle, Sparkles } from "lucide-react";
import { api, fmtPrice } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export default function OrderConfirmation() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id") || "";
  const { user } = useAuth();
  const { clearCart } = useCart();
  const [state, setState] = useState("loading");
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const poll = async () => {
      try {
        const { data } = await api.get(`/orders/${id}/payment-status`, { params: { session_id: sessionId } });
        if (cancelled) return;
        if (data.payment_status === "payee") {
          setState("paid");
          clearCart();
          const o = await api.get(`/orders/${id}`);
          if (!cancelled) setOrder(o.data);
          return;
        }
        tries += 1;
        if (tries < 12) setTimeout(poll, 2500);
        else setState("pending");
      } catch {
        if (!cancelled) setState("error");
      }
    };
    poll();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sessionId]);

  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-40 text-center" data-testid="order-confirmation-page">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
        {state === "loading" && (
          <>
            <Clock size={56} className="mx-auto animate-pulse text-brand" />
            <h1 className="mt-6 font-serif text-3xl font-semibold text-obsidian">Vérification du paiement…</h1>
            <p className="mt-3 text-stone2">Nous confirmons votre paiement auprès de la banque, un instant.</p>
          </>
        )}
        {state === "paid" && (
          <>
            <CheckCircle2 size={64} className="mx-auto text-brand" />
            <h1 className="mt-6 font-serif text-3xl font-semibold text-obsidian" data-testid="payment-success-title">Paiement confirmé !</h1>
            <p className="mt-3 text-stone2">
              Commande <span className="font-mono font-semibold text-brand">#{id.slice(0, 8).toUpperCase()}</span>
              {order && <> — Total réglé par carte : <span className="font-mono font-semibold">{fmtPrice(order.total)}</span></>}
            </p>
            {order?.customer?.email && (
              <p className="mt-2 text-sm text-stone2">Un email de confirmation a été envoyé à <span className="font-semibold text-brand">{order.customer.email}</span>.</p>
            )}
            {order?.points_earned > 0 && user && (
              <p className="mx-auto mt-5 flex max-w-md items-center justify-center gap-2 rounded-2xl bg-brand-pale p-4 text-sm font-medium text-brand">
                <Sparkles size={16} /> {order.points_earned} points fidélité seront crédités à la livraison.
              </p>
            )}
            <div className="mt-8 flex justify-center gap-4">
              <Link to="/catalogue" className="btn-outline" data-testid="confirmation-continue">Continuer mes achats</Link>
              {user && <Link to="/compte" className="btn-brand" data-testid="confirmation-account">Suivre ma commande</Link>}
            </div>
          </>
        )}
        {state === "pending" && (
          <>
            <Clock size={56} className="mx-auto text-gold" />
            <h1 className="mt-6 font-serif text-3xl font-semibold text-obsidian" data-testid="payment-pending-title">Paiement en cours de traitement</h1>
            <p className="mt-3 text-stone2">Votre paiement n'est pas encore confirmé. Il peut prendre quelques minutes — rechargez cette page dans un instant.</p>
            <Link to="/" className="btn-brand mt-8" data-testid="pending-home">Retour à l'accueil</Link>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle size={56} className="mx-auto text-terra" />
            <h1 className="mt-6 font-serif text-3xl font-semibold text-obsidian" data-testid="payment-error-title">Impossible de vérifier le paiement</h1>
            <p className="mt-3 text-stone2">Contactez-nous au 0770777685 en mentionnant la référence <span className="font-mono font-semibold">#{id.slice(0, 8).toUpperCase()}</span>.</p>
            <Link to="/" className="btn-brand mt-8">Retour à l'accueil</Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
