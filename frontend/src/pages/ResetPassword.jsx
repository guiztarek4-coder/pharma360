import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { ShieldCheck, CheckCircle } from "lucide-react";
import api, { formatApiError } from "@/lib/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (pwd.length < 6) { toast.error("Le mot de passe doit contenir au moins 6 caractères"); return; }
    if (pwd !== confirm) { toast.error("Les mots de passe ne correspondent pas"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password: pwd });
      setDone(true);
      toast.success("Mot de passe réinitialisé");
      setTimeout(() => navigate("/compte"), 2000);
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-16">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm" data-testid="reset-password-page">
        {!token ? (
          <p className="text-center text-slate-500">Lien invalide. <Link to="/compte" className="text-mint-700 underline">Se connecter</Link></p>
        ) : done ? (
          <div className="text-center">
            <CheckCircle className="w-14 h-14 text-mint-500 mx-auto mb-3" />
            <h1 className="font-display font-extrabold text-2xl mb-2">Mot de passe modifié</h1>
            <p className="text-slate-500 text-sm">Redirection vers la connexion…</p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-mint-50 grid place-items-center mx-auto mb-3"><ShieldCheck className="w-6 h-6 text-mint-600" /></div>
            <h1 className="font-display font-extrabold text-2xl text-center mb-1">Nouveau mot de passe</h1>
            <p className="text-slate-500 text-sm text-center mb-6">Choisissez un nouveau mot de passe pour votre compte.</p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Nouveau mot de passe</label>
                <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required data-testid="reset-password-input" className="w-full px-4 py-2.5 rounded-xl border border-mint-200 outline-none focus:ring-2 focus:ring-mint-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Confirmer le mot de passe</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required data-testid="reset-password-confirm" className="w-full px-4 py-2.5 rounded-xl border border-mint-200 outline-none focus:ring-2 focus:ring-mint-500" />
              </div>
              <button type="submit" disabled={loading} data-testid="reset-password-submit" className="w-full py-3 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold disabled:opacity-50">{loading ? "…" : "Réinitialiser"}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
