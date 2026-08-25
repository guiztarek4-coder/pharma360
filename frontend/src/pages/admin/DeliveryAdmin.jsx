import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Truck, Mail, Search, Gift } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function DeliveryAdmin() {
  const [delivery, setDelivery] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);

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
                <button onClick={() => setEditing({ ...w })} data-testid={`wilaya-config-${w.code}`}
                  className="rounded-full border border-brand px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand-pale">
                  Relais & villes
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md" data-testid="wilaya-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{editing?.code} — {editing?.name}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="mt-2 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-stone2">Communes / villes (1 par ligne — vide = saisie libre au checkout)</span>
                <textarea rows={4} value={(editing.cities || []).join("\n")} data-testid="wilaya-cities-input"
                  onChange={(e) => setEditing({ ...editing, cities: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                  className="input-field mt-1.5 resize-none text-sm" placeholder="Ex. Saïd Hamdine&#10;Hydra&#10;Bab Ezzouar" />
              </label>
              <div className="flex items-center justify-between rounded-xl bg-sand px-4 py-3">
                <span className="text-sm font-semibold text-obsidian">Points relais activés</span>
                <Switch checked={!!editing.relay_enabled} data-testid="relay-toggle"
                  onCheckedChange={(v) => setEditing({ ...editing, relay_enabled: v })} />
              </div>
              {editing.relay_enabled && (
                <>
                  <label className="block">
                    <span className="text-xs font-semibold text-stone2">Tarif point relais (DA)</span>
                    <input type="number" value={editing.relay_fee ?? 0} data-testid="relay-fee-input"
                      onChange={(e) => setEditing({ ...editing, relay_fee: parseInt(e.target.value) || 0 })}
                      className="input-field mt-1.5 font-mono" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-stone2">Points relais (1 par ligne)</span>
                    <textarea rows={4} value={(editing.relay_points || []).join("\n")} data-testid="relay-points-input"
                      onChange={(e) => setEditing({ ...editing, relay_points: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                      className="input-field mt-1.5 resize-none text-sm" placeholder="Ex. Pharmacie L'olivier — Saïd Hamdine" />
                  </label>
                </>
              )}
              <button
                onClick={() => {
                  setDelivery((d) => ({ ...d, wilayas: d.wilayas.map((w) => (w.code === editing.code ? editing : w)) }));
                  setEditing(null);
                  toast.success(`${editing.name} mis à jour — pensez à enregistrer`);
                }}
                data-testid="wilaya-dialog-save" className="btn-brand w-full">
                Appliquer
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <button onClick={save} disabled={saving} className="btn-brand disabled:opacity-50" data-testid="delivery-save">
        <Save size={15} /> {saving ? "Enregistrement…" : "Enregistrer les paramètres"}
      </button>
    </div>
  );
}
