import { useState } from "react";
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useSettings } from "@/context/SettingsContext";

export default function Contact() {
  const { settings } = useSettings();
  const [f, setF] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name || !f.email || !f.message) { toast.error("Champs requis manquants"); return; }
    setLoading(true);
    try {
      await api.post("/contact", f);
      toast.success("Message envoyé ! Nous vous répondrons rapidement.");
      setF({ name: "", email: "", subject: "", message: "" });
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display font-extrabold text-3xl text-slate-dark mb-2">Contactez-nous</h1>
      <p className="text-slate-500 mb-8">Une question, un conseil ? Notre équipe est à votre écoute 7j/7.</p>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          {[[MapPin, "Adresse", settings.address], [Phone, "Téléphone", settings.phone], [Mail, "Email", settings.email], [Clock, "Horaires", settings.horaires]].map(([Icon, t, v], i) => (
            <div key={i} className="flex items-start gap-4 bg-white rounded-2xl border border-slate-200/80 p-5">
              <span className="w-11 h-11 rounded-xl bg-mint-50 grid place-items-center shrink-0"><Icon className="w-5 h-5 text-mint-600" /></span>
              <div><div className="font-display font-bold text-sm">{t}</div><div className="text-slate-600 text-sm">{v}</div></div>
            </div>
          ))}
          <div className="rounded-2xl overflow-hidden border border-slate-200/80 h-64" data-testid="contact-map">
            <iframe title="Pharma360 Alger" width="100%" height="100%" style={{ border: 0 }} loading="lazy"
              src="https://www.openstreetmap.org/export/embed.html?bbox=3.0400%2C36.7600%2C3.0800%2C36.7850&layer=mapnik&marker=36.7725%2C3.0600" />
          </div>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 h-fit">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nom *" value={f.name} onChange={set("name")} testid="contact-name" />
            <Field label="Email *" type="email" value={f.email} onChange={set("email")} testid="contact-email" />
          </div>
          <Field label="Sujet" value={f.subject} onChange={set("subject")} testid="contact-subject" />
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Message *</label>
            <textarea rows={5} value={f.message} onChange={set("message")} data-testid="contact-message"
              className="w-full px-4 py-2.5 rounded-xl border border-mint-200 outline-none focus:ring-2 focus:ring-mint-500" />
          </div>
          <button type="submit" disabled={loading} data-testid="contact-submit"
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold shadow-lg shadow-mint-600/30 disabled:opacity-50">
            <Send className="w-4 h-4" /> {loading ? "Envoi…" : "Envoyer"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, testid, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
      <input {...props} data-testid={testid} className="w-full px-4 py-2.5 rounded-xl border border-mint-200 outline-none focus:ring-2 focus:ring-mint-500" />
    </div>
  );
}
