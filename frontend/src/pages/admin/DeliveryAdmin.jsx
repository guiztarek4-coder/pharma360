import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Truck, Mail, Search, Gift } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { Switch } from "@/components/ui/switch";

export default function DeliveryAdmin() {
  const [delivery, setDelivery] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/admin/settings").then((r) => setDelivery(r.data.delivery)).catch(() => {});
  }, []);

  if (!delivery) return <div className="h-64 animate-pulse rounded-3xl bg-sand" />;

  const setFee = (code, fee) => {
    setDelivery((d) => ({
      ...d,
      wilayas: d.wilayas.map((w) => (w.code === code ? { ...w, fee: parseInt(fee) || 0 } : w)),
    }));
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api.put("/admin/settings", { delivery });
      toast.success("Paramètres de livraison enregistrés");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const visible = delivery.wilayas.filter(
    (w) => w.name.toLowerCase().includes(search.toLowerCase()) || w.code.includes(search)
  );

  return (
    <div className="space-y-6" data-testid="admin-delivery">
      <div className="rounded-3xl border bg-white p-7">
        <p className="flex items-center gap-2 badge-mono text-stone2"><Mail size={13} /> Alerte nouvelle commande</p>
        <p className="mt-2 text-sm text-stone2">Un email récapitulatif est envoyé à cette adresse à chaque commande passée. Laissez vide pour désactiver.</p>
        <input type="email" value={delivery.notify_email} data-testid="notify-email-input"
          onChange={(e) => setDelivery({ ...delivery, notify_email: e.target.value })}
          placeholder="votre@email.com" className="input-field mt-3 max-w-md" />
        {!delivery.notify_email && (
          <p className="mt-3 max-w-md rounded-xl border border-terra/40 bg-terra/10 px-4 py-3 text-xs font-medium text-terra" data-testid="notify-email-hint">
            Alerte inactive : saisissez votre adresse email réelle pour recevoir une notification à chaque nouvelle commande.
          </p>
        )}
      </div>

      <div className="rounded-3xl border bg-white p-7" data-testid="free-shipping-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 badge-mono text-stone2"><Gift size={13} /> Livraison offerte</p>
            <p className="mt-2 text-sm text-stone2">Offrez la livraison au-dessus d'un montant d'achat (sous-total produits).</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-stone2">{delivery.free_enabled ? "Activée" : "Désactivée"}</span>
            <Switch checked={delivery.free_enabled} data-testid="free-shipping-toggle"
              onCheckedChange={(v) => setDelivery({ ...delivery, free_enabled: v })} />
          </div>
        </div>
        {delivery.free_enabled && (
          <label className="mt-4 block max-w-xs">
            <span className="text-xs font-semibold text-stone2">Seuil (DA)</span>
            <input type="number" value={delivery.free_threshold} data-testid="free-threshold-input"
              onChange={(e) => setDelivery({ ...delivery, free_threshold: parseInt(e.target.value) || 0 })}
              className="input-field mt-1.5 font-mono" />
          </label>
        )}
      </div>

      <div className="rounded-3xl border bg-white p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 badge-mono text-stone2"><Truck size={13} /> Frais par wilaya ({delivery.wilayas.length})</p>
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…"
              data-testid="wilaya-search" className="input-field !w-56 !py-2 !pl-9 text-xs" />
          </div>
        </div>
        <div className="mt-4 grid max-h-[420px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2" data-testid="wilaya-list">
          {visible.map((w) => (
            <div key={w.code} className="flex items-center justify-between gap-3 rounded-xl bg-sand px-4 py-2.5"
              data-testid={`wilaya-row-${w.code}`}>
              <span className="text-sm text-obsidian">
                <span className="mr-2 font-mono text-xs text-stone2">{w.code}</span>{w.name}
              </span>
              <span className="flex items-center gap-1.5">
                <input type="number" value={w.fee} onChange={(e) => setFee(w.code, e.target.value)}
                  data-testid={`wilaya-fee-${w.code}`} className="input-field !w-24 !py-1.5 text-right font-mono text-xs" />
                <span className="text-xs text-stone2">DA</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-brand disabled:opacity-50" data-testid="delivery-save">
        <Save size={15} /> {saving ? "Enregistrement…" : "Enregistrer les paramètres"}
      </button>
    </div>
  );
}
