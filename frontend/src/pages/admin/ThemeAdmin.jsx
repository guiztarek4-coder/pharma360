import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { useSite } from "@/context/SiteContext";

const PRESETS = [
  { key: "olive", label: "Olive Botanique", primary: "#3E4E30", primary_hover: "#2E3B23", primary_pale: "#EAF0E6", accent: "#C86D51" },
  { key: "terracotta", label: "Terracotta", primary: "#A5512F", primary_hover: "#7E3E22", primary_pale: "#F7E9E2", accent: "#3E4E30" },
  { key: "sauge", label: "Sauge", primary: "#60744B", primary_hover: "#4A5A39", primary_pale: "#EDF2E8", accent: "#D4A359" },
  { key: "minuit", label: "Minuit", primary: "#23282E", primary_hover: "#14181C", primary_pale: "#E8EAED", accent: "#D4A359" },
];

export default function ThemeAdmin() {
  const { settings, reloadSettings } = useSite();
  const [theme, setTheme] = useState({ ...settings.theme });
  const [contact, setContact] = useState({ ...settings.contact, phones: settings.contact.phones.join(", ") });
  const [saving, setSaving] = useState(false);

  const applyPreset = (p) => {
    setTheme((t) => ({ ...t, preset: p.key, primary: p.primary, primary_hover: p.primary_hover, primary_pale: p.primary_pale, accent: p.accent }));
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api.put("/admin/settings", {
        theme,
        contact: { ...contact, phones: contact.phones.split(",").map((p) => p.trim()).filter(Boolean) },
      });
      await reloadSettings();
      toast.success("Thème et informations du site mis à jour");
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6" data-testid="admin-theme">
      <div className="rounded-3xl border bg-white p-7">
        <p className="badge-mono text-stone2">Palette du site</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRESETS.map((p) => (
            <button key={p.key} onClick={() => applyPreset(p)} data-testid={`preset-${p.key}`}
              className={`card-lift rounded-2xl border-2 p-4 text-left transition-all ${theme.preset === p.key ? "border-brand" : "border-transparent bg-sand"}`}>
              <div className="flex gap-1.5">
                <span className="h-6 w-6 rounded-full" style={{ background: p.primary }} />
                <span className="h-6 w-6 rounded-full" style={{ background: p.accent }} />
                <span className="h-6 w-6 rounded-full border" style={{ background: p.primary_pale }} />
              </div>
              <p className="mt-2.5 text-xs font-bold text-obsidian">{p.label}</p>
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[["primary", "Couleur principale"], ["primary_hover", "Survol"], ["primary_pale", "Fond pâle"], ["accent", "Accent"]].map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-xs font-semibold text-stone2">{label}</span>
              <span className="mt-1.5 flex items-center gap-2">
                <input type="color" value={theme[key]} onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                  data-testid={`color-${key}`} className="h-10 w-12 cursor-pointer rounded-lg border" />
                <input value={theme[key]} onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                  className="input-field !py-2 font-mono text-xs" />
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-7">
        <p className="badge-mono text-stone2">Coordonnées affichées sur le site</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-stone2">Téléphones (séparés par des virgules)</span>
            <input value={contact.phones} onChange={(e) => setContact({ ...contact, phones: e.target.value })}
              data-testid="contact-phones-input" className="input-field mt-1.5" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone2">Horaires</span>
            <input value={contact.hours} onChange={(e) => setContact({ ...contact, hours: e.target.value })}
              data-testid="contact-hours-input" className="input-field mt-1.5" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone2">Lien Google Maps</span>
            <input value={contact.maps_url} onChange={(e) => setContact({ ...contact, maps_url: e.target.value })}
              data-testid="contact-maps-input" className="input-field mt-1.5" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone2">Libellé adresse</span>
            <input value={contact.address_label} onChange={(e) => setContact({ ...contact, address_label: e.target.value })}
              data-testid="contact-address-input" className="input-field mt-1.5" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone2">Instagram (URL)</span>
            <input value={contact.instagram} onChange={(e) => setContact({ ...contact, instagram: e.target.value })}
              data-testid="contact-instagram-input" className="input-field mt-1.5" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone2">Pseudo Instagram</span>
            <input value={contact.instagram_handle} onChange={(e) => setContact({ ...contact, instagram_handle: e.target.value })}
              data-testid="contact-instagram-handle-input" className="input-field mt-1.5" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone2">Facebook (URL, optionnel)</span>
            <input value={contact.facebook} onChange={(e) => setContact({ ...contact, facebook: e.target.value })}
              data-testid="contact-facebook-input" className="input-field mt-1.5" placeholder="Ajouter plus tard" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone2">TikTok (URL, optionnel)</span>
            <input value={contact.tiktok} onChange={(e) => setContact({ ...contact, tiktok: e.target.value })}
              data-testid="contact-tiktok-input" className="input-field mt-1.5" placeholder="Ajouter plus tard" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone2">WhatsApp (lien, optionnel)</span>
            <input value={contact.whatsapp} onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })}
              data-testid="contact-whatsapp-input" className="input-field mt-1.5" placeholder="https://wa.me/…" />
          </label>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-brand disabled:opacity-50" data-testid="theme-save">
        <Save size={15} /> {saving ? "Enregistrement…" : "Publier les modifications"}
      </button>
    </div>
  );
}
