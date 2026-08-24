import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, fmtPrice, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export default function Cart() {
  const { user } = useAuth();
  const { items, setQty, removeFromCart, clearCart, total, priceOf } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "", email: user?.email || "", address: "", wilaya: "" });
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState(null);
  const [delivery, setDelivery] = useState(null);

  useEffect(() => {
    api.get("/delivery").then((r) => setDelivery(r.data)).catch(() => {});
  }, []);

  const shippingFee = (() => {
    if (!delivery || !form.wilaya) return 0;
    const fee = delivery.wilayas.find((w) => w.name === form.wilaya)?.fee ?? 0;
    if (delivery.free_enabled && delivery.free_threshold > 0 && total >= delivery.free_threshold) return 0;
    return fee;
  })();
  const grandTotal = total + shippingFee;

  const submit = async (e) => {
    e.preventDefault();
    if (placing) return;
    setPlacing(true);
    try {
      const { data } = await api.post("/orders", {
        customer: form,
        items: items.map((i) => ({ product_id: i.product.id, qty: i.qty })),
      });
      setDone(data);
      clearCart();
    } catch (err) {
      toast.error(apiError(err, "Impossible de passer la commande"));
    } finally {
      setPlacing(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-6 pb-24 pt-40 text-center" data-testid="order-success">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
          <CheckCircle2 size={64} className="mx-auto text-brand" />
          <h1 className="mt-6 font-serif text-3xl font-semibold text-obsidian">Commande confirmée !</h1>
          <p className="mt-3 text-stone2">
            Référence <span className="font-mono font-semibold text-brand">{done.id.slice(0, 8).toUpperCase()}</span> — Total <span className="font-mono font-semibold">{fmtPrice(done.total)}</span>.
            Paiement à la livraison.
          </p>
          {done.customer?.email && (
            <p className="mt-3 text-sm text-stone2" data-testid="confirmation-email-note">
              Un email de confirmation a été envoyé à <span className="font-semibold text-brand">{done.customer.email}</span>.
            </p>
          )}
          <p className="mt-2 text-sm text-stone2" data-testid="order-shipping-line">
            Livraison {done.customer?.wilaya ? `(${done.customer.wilaya})` : ""} : {done.delivery_fee > 0 ? fmtPrice(done.delivery_fee) : "offerte"}.
          </p>
          {done.points_earned > 0 && (
            <p className="mx-auto mt-5 flex max-w-md items-center justify-center gap-2 rounded-2xl bg-brand-pale p-4 text-sm font-medium text-brand" data-testid="points-earned">
              <Sparkles size={16} /> Vous gagnerez <strong>{done.points_earned} points fidélité</strong> à la livraison de votre commande.
            </p>
          )}
          <div className="mt-8 flex justify-center gap-4">
            <Link to="/catalogue" className="btn-outline" data-testid="continue-shopping">Continuer mes achats</Link>
            {user && <Link to="/compte" className="btn-brand" data-testid="view-my-orders">Suivre ma commande</Link>}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-32" data-testid="cart-page">
      <p className="badge-mono text-terra">Panier</p>
      <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-obsidian sm:text-4xl">Votre panier</h1>

      {items.length === 0 ? (
        <div className="mt-16 text-center" data-testid="cart-empty">
          <ShoppingBag size={48} className="mx-auto text-stone2/40" />
          <p className="mt-4 font-serif text-2xl text-stone2">Votre panier est vide.</p>
          <Link to="/catalogue" className="btn-brand mt-8" data-testid="empty-cart-cta">Découvrir le catalogue</Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3" data-testid="cart-items">
            {items.map(({ product, qty }) => (
              <motion.div key={product.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="flex gap-4 rounded-3xl border bg-white p-4" data-testid={`cart-item-${product.id}`}>
                <img src={product.image} alt={product.name} className="h-24 w-24 shrink-0 rounded-2xl object-cover" />
                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="badge-mono text-stone2">{product.category}</p>
                      <p className="mt-0.5 font-serif text-base font-semibold text-obsidian">{product.name}</p>
                    </div>
                    <button onClick={() => removeFromCart(product.id)} data-testid={`remove-item-${product.id}`} aria-label="Retirer"
                      className="text-stone2 transition-colors hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center rounded-full border">
                      <button onClick={() => setQty(product.id, qty - 1)} data-testid={`cart-minus-${product.id}`} aria-label="Diminuer" className="flex h-8 w-8 items-center justify-center hover:text-brand"><Minus size={13} /></button>
                      <span className="w-8 text-center font-mono text-sm font-semibold">{qty}</span>
                      <button onClick={() => setQty(product.id, qty + 1)} data-testid={`cart-plus-${product.id}`} aria-label="Augmenter" className="flex h-8 w-8 items-center justify-center hover:text-brand"><Plus size={13} /></button>
                    </div>
                    <p className="font-mono text-sm font-semibold text-brand">{fmtPrice(priceOf(product) * qty)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="lg:col-span-2">
            <form onSubmit={submit} className="sticky top-28 rounded-3xl border bg-white p-7" data-testid="checkout-form">
              <h2 className="font-serif text-xl font-semibold text-obsidian">Livraison & paiement</h2>
              {user && (
                <p className="mt-2 rounded-xl bg-brand-pale px-3 py-2 text-xs font-medium text-brand">
                  Prix membres appliqués — vous cumulez des points sur cette commande.
                </p>
              )}
              <div className="mt-5 space-y-3">
                <input required placeholder="Nom complet" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  data-testid="checkout-name" className="input-field" />
                <input required placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  data-testid="checkout-phone" className="input-field" />
                <input type="email" placeholder="Email (recevoir la confirmation de commande)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  data-testid="checkout-email" className="input-field" />
                <select required value={form.wilaya} onChange={(e) => setForm({ ...form, wilaya: e.target.value })}
                  data-testid="checkout-wilaya" className="input-field">
                  <option value="">Wilaya de livraison…</option>
                  {(delivery?.wilayas || []).map((w) => (
                    <option key={w.code} value={w.name}>{w.code} — {w.name} ({w.fee} DA)</option>
                  ))}
                </select>
                <textarea required placeholder="Adresse de livraison complète" rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  data-testid="checkout-address" className="input-field resize-none" />
              </div>
              <div className="mt-6 space-y-2 border-t pt-5">
                <div className="flex justify-between text-sm text-stone2">
                  <span>Sous-total</span><span className="font-mono">{fmtPrice(total)}</span>
                </div>
                <div className="flex justify-between text-sm text-stone2">
                  <span>Livraison {form.wilaya ? `(${form.wilaya})` : ""}</span>
                  <span className="font-mono" data-testid="shipping-fee">
                    {!form.wilaya ? "—" : shippingFee === 0 ? "Offerte" : fmtPrice(shippingFee)}
                  </span>
                </div>
                {delivery?.free_enabled && delivery.free_threshold > 0 && total < delivery.free_threshold && (
                  <p className="rounded-xl bg-brand-pale px-3 py-2 text-xs font-medium text-brand" data-testid="free-shipping-hint">
                    Plus que {fmtPrice(delivery.free_threshold - total)} pour la livraison offerte !
                  </p>
                )}
                <div className="flex justify-between">
                  <span className="font-semibold text-obsidian">Total <span className="text-xs font-normal text-stone2">(paiement à la livraison)</span></span>
                  <span className="font-mono text-xl font-semibold text-brand" data-testid="cart-total">{fmtPrice(grandTotal)}</span>
                </div>
              </div>
              <button type="submit" disabled={placing} data-testid="place-order-button"
                className="btn-brand mt-6 w-full disabled:opacity-50">
                {placing ? "Envoi en cours…" : "Confirmer la commande"}
              </button>
              {!user && (
                <p className="mt-3 text-center text-xs text-stone2">
                  <button type="button" onClick={() => navigate("/auth")} className="font-semibold text-terra underline underline-offset-2" data-testid="cart-login-hint">
                    Connectez-vous
                  </button>{" "}
                  pour payer au prix membre.
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
