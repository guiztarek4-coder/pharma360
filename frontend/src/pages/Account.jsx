import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, Sparkles, Package, Gift, Tag } from "lucide-react";
import { api, fmtPrice, fmtDate } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export const STATUS_LABELS = {
  en_attente: { label: "En attente", cls: "bg-amber-100 text-amber-800" },
  confirmee: { label: "Confirmée", cls: "bg-blue-100 text-blue-800" },
  en_preparation: { label: "En préparation", cls: "bg-indigo-100 text-indigo-800" },
  livree: { label: "Livrée", cls: "bg-green-100 text-green-800" },
  annulee: { label: "Annulée", cls: "bg-red-100 text-red-700" },
};

export default function Account() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loyalty, setLoyalty] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (user === false) { navigate("/auth"); return; }
    if (!user) return;
    api.get("/loyalty/me").then((r) => setLoyalty(r.data)).catch(() => {});
    api.get("/orders/my").then((r) => setOrders(r.data)).catch(() => {});
  }, [user, navigate]);

  if (!user) return null;

  const progress = loyalty?.next_tier
    ? Math.min(100, ((loyalty.points - loyalty.tier.min) / (loyalty.next_tier.min - loyalty.tier.min)) * 100)
    : 100;

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-32" data-testid="account-page">
      <p className="badge-mono text-terra">Mon espace</p>
      <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-obsidian sm:text-4xl" data-testid="account-greeting">
        Bonjour, {user.name}
      </h1>

      <div className="mt-10 grid gap-8 lg:grid-cols-5">
        {/* Loyalty card */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[2rem] bg-obsidian p-8 text-bone grain lg:col-span-2" data-testid="loyalty-card">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20" style={{ background: loyalty?.tier?.color || "#D4A359" }} />
          <div className="flex items-center justify-between">
            <p className="badge-mono text-bone/50">Programme Privilège</p>
            {loyalty && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-obsidian"
                style={{ background: loyalty.tier.color }} data-testid="current-tier-badge">
                <Award size={12} /> {loyalty.tier.name}
              </span>
            )}
          </div>
          <p className="mt-8 font-mono text-5xl font-semibold" data-testid="points-balance">{loyalty?.points ?? user.points ?? 0}</p>
          <p className="badge-mono mt-1 text-bone/50">points fidélité</p>

          {loyalty?.next_tier ? (
            <div className="mt-8">
              <div className="flex justify-between text-xs text-bone/60">
                <span>{loyalty.tier.name}</span>
                <span data-testid="next-tier-label">Plus que {loyalty.next_tier.min - loyalty.points} pts → {loyalty.next_tier.name}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-bone/15">
                <motion.div className="h-full rounded-full" style={{ background: loyalty.next_tier.color }}
                  initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1.2, ease: "easeOut" }}
                  data-testid="tier-progress-bar" />
              </div>
            </div>
          ) : (
            <p className="mt-8 text-sm font-medium text-gold" data-testid="max-tier-label">Statut maximum atteint — félicitations !</p>
          )}

          {loyalty && (
            <div className="mt-8 border-t border-bone/10 pt-6">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-bone/50"><Gift size={13} /> Vos avantages {loyalty.tier.name}</p>
              <ul className="mt-3 space-y-2">
                {[...loyalty.tier.gifts, ...loyalty.tier.offers].map((g) => (
                  <li key={g} className="flex items-start gap-2 text-sm text-bone/80">
                    <Sparkles size={13} className="mt-0.5 shrink-0" style={{ color: loyalty.tier.color }} /> {g}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>

        {/* Orders */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-obsidian">
              <Package size={18} className="text-brand" /> Mes commandes
            </h2>
            <Link to="/catalogue" className="text-sm font-semibold text-brand" data-testid="account-shop-link">Commander à nouveau</Link>
          </div>

          <div className="mt-5 space-y-4" data-testid="orders-list">
            {orders.length === 0 ? (
              <div className="rounded-3xl border bg-white p-10 text-center" data-testid="orders-empty">
                <p className="font-serif text-lg text-stone2">Aucune commande pour le moment.</p>
                <Link to="/catalogue" className="btn-brand mt-5">Découvrir le catalogue</Link>
              </div>
            ) : (
              orders.map((o) => {
                const st = STATUS_LABELS[o.status] || STATUS_LABELS.en_attente;
                return (
                  <div key={o.id} className="rounded-3xl border bg-white p-6" data-testid={`order-${o.id}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-semibold text-obsidian">#{o.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-stone2">{fmtDate(o.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${st.cls}`} data-testid={`order-status-${o.id}`}>{st.label}</span>
                        <span className="font-mono text-sm font-semibold text-brand">{fmtPrice(o.total)}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {o.items.map((it) => (
                        <span key={it.product_id} className="rounded-full bg-sand px-3 py-1 text-xs text-obsidian/70">
                          {it.qty} × {it.name}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-stone2" data-testid={`order-shipping-${o.id}`}>Livraison {o.customer?.wilaya ? `(${o.customer.wilaya})` : ""} : {o.delivery_fee > 0 ? fmtPrice(o.delivery_fee) : "offerte"}</p>
                    {o.points_earned > 0 && (
                      <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-brand">
                        <Tag size={12} />
                        {o.points_credited ? `${o.points_earned} points crédités` : `${o.points_earned} points crédités à la livraison`}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
