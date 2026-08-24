import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import { TrendingUp, ShoppingCart, Package, Users, AlertTriangle } from "lucide-react";
import { api, fmtPrice, fmtDate } from "@/lib/api";
import { STATUS_LABELS } from "../Account";

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  if (!stats) return <div className="h-64 animate-pulse rounded-3xl bg-sand" data-testid="stats-loading" />;

  const cards = [
    { label: "Chiffre d'affaires", value: fmtPrice(stats.revenue), icon: TrendingUp, testid: "stat-revenue" },
    { label: "Commandes", value: stats.orders_count, icon: ShoppingCart, testid: "stat-orders" },
    { label: "Produits", value: stats.products_count, icon: Package, testid: "stat-products" },
    { label: "Clients", value: stats.clients_count, icon: Users, testid: "stat-clients" },
  ];

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-3xl border bg-white p-6" data-testid={c.testid}>
            <div className="flex items-center justify-between">
              <p className="badge-mono text-stone2">{c.label}</p>
              <c.icon size={16} className="text-brand" />
            </div>
            <p className="mt-3 font-mono text-2xl font-semibold text-obsidian">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border bg-white p-6" data-testid="chart-revenue">
          <p className="badge-mono text-stone2">Revenus — 7 derniers jours</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenue_7d}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3E4E30" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3E4E30" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE9E2" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#73786D" />
                <YAxis tick={{ fontSize: 11 }} stroke="#73786D" />
                <Tooltip formatter={(v) => fmtPrice(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#3E4E30" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6" data-testid="chart-categories">
          <p className="badge-mono text-stone2">Ventes par catégorie</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.by_category}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE9E2" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} stroke="#73786D" />
                <YAxis tick={{ fontSize: 11 }} stroke="#73786D" />
                <Tooltip formatter={(v) => fmtPrice(v)} />
                <Bar dataKey="total" fill="#C86D51" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border bg-white p-6" data-testid="low-stock-panel">
          <p className="flex items-center gap-2 badge-mono text-stone2"><AlertTriangle size={13} className="text-terra" /> Stock faible (&lt; 10)</p>
          {stats.low_stock.length === 0 ? (
            <p className="mt-4 text-sm text-stone2">Aucun produit en stock faible.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {stats.low_stock.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-xl bg-sand px-4 py-2.5 text-sm">
                  <span className="font-medium text-obsidian">{p.name}</span>
                  <span className="font-mono text-xs font-bold text-terra">{p.stock} restants</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border bg-white p-6" data-testid="recent-orders-panel">
          <p className="badge-mono text-stone2">Dernières commandes</p>
          {stats.recent_orders.length === 0 ? (
            <p className="mt-4 text-sm text-stone2">Aucune commande pour le moment.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {stats.recent_orders.map((o) => {
                const st = STATUS_LABELS[o.status] || STATUS_LABELS.en_attente;
                return (
                  <li key={o.id} className="flex items-center justify-between rounded-xl bg-sand px-4 py-2.5 text-sm">
                    <div>
                      <span className="font-mono text-xs font-semibold text-obsidian">#{o.id.slice(0, 8).toUpperCase()}</span>
                      <span className="ml-2 text-xs text-stone2">{o.customer?.name} · {fmtDate(o.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                      <span className="font-mono text-xs font-semibold text-brand">{fmtPrice(o.total)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
