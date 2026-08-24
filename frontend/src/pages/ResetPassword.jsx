import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound, Leaf } from "lucide-react";
import { toast } from "sonner";
import { api, apiError } from "@/lib/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Les mots de passe ne correspondent pas"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", { token, new_password: password });
      toast.success(data.message);
      navigate("/auth");
    } catch (err) {
      toast.error(apiError(err, "Lien invalide ou expiré"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-6 pb-16 pt-28" data-testid="reset-page">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-[2rem] border bg-white p-8 shadow-xl sm:p-10">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-bone"><Leaf size={18} /></span>
          <p className="font-serif text-xl font-semibold text-obsidian">Nouveau mot de passe</p>
        </div>
        {!token ? (
          <div className="mt-6" data-testid="reset-no-token">
            <p className="text-sm text-stone2">Lien de réinitialisation invalide.</p>
            <Link to="/auth" className="btn-brand mt-6" data-testid="reset-back-auth">Retour</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3" data-testid="reset-form">
            <div className="relative">
              <KeyRound size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone2" />
              <input required type="password" minLength={6} placeholder="Nouveau mot de passe" value={password}
                onChange={(e) => setPassword(e.target.value)} data-testid="reset-password" className="input-field !pl-10" />
            </div>
            <input required type="password" minLength={6} placeholder="Confirmer le mot de passe" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} data-testid="reset-confirm" className="input-field" />
            <button type="submit" disabled={loading} data-testid="reset-submit" className="btn-brand w-full disabled:opacity-50">
              {loading ? "Mise à jour…" : "Réinitialiser"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
