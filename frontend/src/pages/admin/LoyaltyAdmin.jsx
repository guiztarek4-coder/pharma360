import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Users } from "lucide-react";
import { api, apiError } from "@/lib/api";

export default function LoyaltyAdmin() {
  const [config, setConfig] = useState(null);
  const [users, setUsers] = useState([]);
  const [pointsDraft, setPointsDraft] = useState({});

  useEffect(() => {
    api.get("/loyalty/config").then((r) => setConfig(r.data)).catch(() => {});
    api.get("/admin/users").then((r) => {
      setUsers(r.data.filter((u) => u.role === "client"));
      const d = {};
      r.data.forEach((u) => { d[u.id] = u.points ?? 0; });
      setPointsDraft(d);
    }).catch(() => {});
  }, []);

  if (!config) return <div className="h-64 animate-pulse rounded-3xl bg-sand" />;

  const updateTier = (key, field, value) => {
    setConfig((c) => ({
      ...c,
      tiers: c.tiers.map((t) => t.key === key ? { ...t, [field]: value } : t),
    }));
  };

  const save = async () => {
    try {
      await api.put("/admin/loyalty/config", config);
      toast.success("Programme fidélité mis à jour");
    } catch (e) { toast.error(apiError(e)); }
  };

  const savePoints = async (u) => {
    try {
      await api.post(`/admin/users/${u.id}/points`, { points: parseInt(pointsDraft[u.id]) || 0 });
      toast.success(`Points de ${u.name} mis à jour`);
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-6" data-testid="admin-loyalty">
      <div className="rounded-3xl border bg-white p-7">
        <p className="badge-mono text-stone2">Règle de points</p>
        <input value={config.points_rule} onChange={(e) => setConfig({ ...config, points_rule: e.target.value })}
          data-testid="loyalty-rule-input" className="input-field mt-3" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {config.tiers.map((t) => (
          <div key={t.key} className="rounded-3xl border bg-white p-6" data-testid={`admin-tier-${t.key}`}>
            <div className="flex items-center justify-between">
              <span className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white" style={{ background: t.color }}>{t.name}</span>
              <input type="number" value={t.min} onChange={(e) => updateTier(t.key, "min", parseInt(e.target.value) || 0)}
                data-testid={`tier-min-${t.key}`} className="input-field !w-24 !py-1.5 text-center font-mono text-xs" title="Seuil de points" />
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-wider text-stone2">Cadeaux (1 par ligne)</p>
            <textarea rows={3} value={t.gifts.join("\n")} data-testid={`tier-gifts-${t.key}`}
              onChange={(e) => updateTier(t.key, "gifts", e.target.value.split("\n").filter(Boolean))}
              className="input-field mt-2 resize-none text-xs" />
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-stone2">Offres exclusives (1 par ligne)</p>
            <textarea rows={3} value={t.offers.join("\n")} data-testid={`tier-offers-${t.key}`}
              onChange={(e) => updateTier(t.key, "offers", e.target.value.split("\n").filter(Boolean))}
              className="input-field mt-2 resize-none text-xs" />
          </div>
        ))}
      </div>

      <button onClick={save} className="btn-brand" data-testid="loyalty-save">
        <Save size={15} /> Enregistrer le programme
      </button>

      <div className="rounded-3xl border bg-white p-7" data-testid="admin-users-points">
        <p className="flex items-center gap-2 badge-mono text-stone2"><Users size={13} /> Points des clients ({users.length})</p>
        <div className="mt-4 space-y-2">
          {users.length === 0 && <p className="text-sm text-stone2">Aucun client inscrit.</p>}
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sand px-4 py-3" data-testid={`user-row-${u.id}`}>
              <div>
                <p className="text-sm font-semibold text-obsidian">{u.name}</p>
                <p className="text-xs text-stone2">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" value={pointsDraft[u.id] ?? 0} data-testid={`points-input-${u.id}`}
                  onChange={(e) => setPointsDraft({ ...pointsDraft, [u.id]: e.target.value })}
                  className="input-field !w-24 !py-1.5 text-center font-mono text-xs" />
                <button onClick={() => savePoints(u)} data-testid={`points-save-${u.id}`}
                  className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-bone">OK</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
