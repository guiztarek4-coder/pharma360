import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Leaf, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Auth() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState("");

  const from = location.state?.from || "/compte";

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "login") {
        const u = await login(form.email, form.password);
        toast.success(`Bienvenue ${u.name} !`);
        navigate(u.role === "admin" ? "/admin" : from);
      } else if (mode === "register") {
        await register({ name: form.name, email: form.email, password: form.password, phone: form.phone });
        toast.success("Compte créé — bienvenue dans le programme Privilège Bronze !");
        navigate("/compte");
      } else {
        const { data } = await api.post("/auth/forgot-password", { email: form.email });
        toast.success(data.message);
        if (data.reset_link) setResetLink(data.reset_link);
      }
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-6 pb-16 pt-28" data-testid="auth-page">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="w-full max-w-md rounded-[2rem] border bg-white p-8 shadow-xl sm:p-10">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-bone"><Leaf size={18} /></span>
          <div>
            <p className="font-serif text-xl font-semibold text-obsidian">L'olivier</p>
            <p className="badge-mono text-stone2 text-[9px]">Espace membre</p>
          </div>
        </div>

        {mode !== "forgot" ? (
          <>
            <div className="mt-8 grid grid-cols-2 rounded-full bg-sand p-1" data-testid="auth-tabs">
              <button onClick={() => setMode("login")} data-testid="tab-login"
                className={`rounded-full py-2 text-sm font-semibold transition-all ${mode === "login" ? "bg-brand text-bone" : "text-stone2"}`}>
                Connexion
              </button>
              <button onClick={() => setMode("register")} data-testid="tab-register"
                className={`rounded-full py-2 text-sm font-semibold transition-all ${mode === "register" ? "bg-brand text-bone" : "text-stone2"}`}>
                Inscription
              </button>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-3" data-testid="auth-form">
              {mode === "register" && (
                <>
                  <input required placeholder="Nom complet" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    data-testid="register-name" className="input-field" />
                  <input placeholder="Téléphone (optionnel)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    data-testid="register-phone" className="input-field" />
                </>
              )}
              <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                data-testid="auth-email" className="input-field" />
              <div className="relative">
                <input required type={showPwd ? "text" : "password"} placeholder="Mot de passe (6 caractères min.)" minLength={6}
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  data-testid="auth-password" className="input-field pr-12" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} data-testid="toggle-password" aria-label="Afficher le mot de passe"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone2 hover:text-brand">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button type="submit" disabled={loading} data-testid="auth-submit" className="btn-brand w-full disabled:opacity-50">
                {loading ? "Patientez…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
              </button>
            </form>

            {mode === "login" && (
              <button onClick={() => setMode("forgot")} data-testid="forgot-password-link"
                className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-terra hover:underline">
                <KeyRound size={12} /> Mot de passe oublié ?
              </button>
            )}

            <p className="mt-6 rounded-xl bg-brand-pale p-3 text-center text-xs text-brand">
              Membre = prix réduits immédiats + points fidélité à chaque commande.
            </p>
          </>
        ) : (
          <div className="mt-8" data-testid="forgot-form">
            <h2 className="font-serif text-xl font-semibold text-obsidian">Mot de passe oublié</h2>
            <p className="mt-2 text-sm text-stone2">Entrez votre email pour recevoir un lien de réinitialisation.</p>
            <form onSubmit={submit} className="mt-5 space-y-3">
              <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                data-testid="forgot-email" className="input-field" />
              <button type="submit" disabled={loading} data-testid="forgot-submit" className="btn-brand w-full disabled:opacity-50">
                {loading ? "Envoi…" : "Envoyer le lien"}
              </button>
            </form>
            {resetLink && (
              <div className="mt-4 rounded-xl border border-brand/30 bg-brand-pale p-4" data-testid="reset-link-box">
                <p className="text-xs font-semibold text-brand">Mode démo — votre lien de réinitialisation :</p>
                <Link to={resetLink} data-testid="reset-link" className="mt-1 block break-all font-mono text-xs text-terra underline">
                  {resetLink}
                </Link>
              </div>
            )}
            <button onClick={() => setMode("login")} data-testid="back-to-login" className="mt-4 w-full text-center text-xs font-semibold text-stone2 hover:text-brand">
              ← Retour à la connexion
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
