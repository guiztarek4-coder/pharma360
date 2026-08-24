import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, fmtPrice, fmtDate, apiError } from "@/lib/api";
import { STATUS_LABELS } from "../Account";

export default function Orders() {
  const [orders, setOrders] = useState(null);

  const load = () => api.get("/admin/orders").then((r) => setOrders(r.data)).catch(() => setOrders([]));
  useEffect(() => { load(); }, []);

  const setStatus = async (order, status) => {
    try {
      await api.put(`/admin/orders/${order.id}/status`, { status });
      toast.success(status === "livree" && order.user_id
        ? `Commande livrée — ${order.points_earned} points crédités au client`
        : "Statut mis à jour");
      load();
    } catch (e) { toast.error(apiError(e)); }
  };

  if (!orders) return <div className="h-64 animate-pulse rounded-3xl bg-sand" />;

  return (
    <div data-testid="admin-orders">
      {orders.length === 0 ? (
        <div className="rounded-3xl border bg-white p-12 text-center text-stone2" data-testid="admin-orders-empty">
          Aucune commande pour le moment.
        </div>
      ) : (
        <div className="space-y-4" data-testid="admin-orders-list">
          {orders.map((o) => {
            const st = STATUS_LABELS[o.status] || STATUS_LABELS.en_attente;
            return (
              <div key={o.id} className="rounded-3xl border bg-white p-6" data-testid={`admin-order-${o.id}`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm font-semibold text-obsidian">#{o.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-stone2">{fmtDate(o.created_at)} · {o.customer?.name} · <span className="font-mono">{o.customer?.phone}</span></p>
                    <p className="mt-0.5 text-xs text-stone2">{o.customer?.wilaya ? `${o.customer.wilaya} — ` : ""}{o.customer?.address}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${st.cls}`} data-testid={`admin-order-status-${o.id}`}>{st.label}</span>
                    <select value={o.status} onChange={(e) => setStatus(o, e.target.value)} data-testid={`status-select-${o.id}`}
                      className="input-field !w-auto !rounded-full !py-1.5 text-xs font-semibold">
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <span className="text-right">
                      <span className="block font-mono text-sm font-semibold text-brand">{fmtPrice(o.total)}</span>
                      <span className="block text-[10px] text-stone2">dont livraison {o.delivery_fee > 0 ? fmtPrice(o.delivery_fee) : "offerte"}</span>
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {o.items.map((it) => (
                    <span key={it.product_id} className="rounded-full bg-sand px-3 py-1 text-xs text-obsidian/70">
                      {it.qty} × {it.name} — {fmtPrice(it.unit_price)}
                    </span>
                  ))}
                </div>
                {o.points_earned > 0 && (
                  <p className="mt-3 text-xs font-medium text-brand">
                    {o.points_credited ? `${o.points_earned} points fidélité crédités` : `${o.points_earned} points seront crédités à la livraison`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
