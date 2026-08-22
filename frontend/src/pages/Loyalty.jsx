import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gift, Award, Sparkles, Crown, Star, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const TIER_ICON = { Bronze: Award, Argent: Star, Or: Crown };
const TIER_COLOR = { Bronze: "text-amber-700 bg-amber-100", Argent: "text-slate-500 bg-slate-100", Or: "text-yellow-600 bg-yellow-100" };

export function LoyaltyContent() {
  const { user, refresh } = useAuth();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);
  const [copied, setCopied] = useState("");

  const load = () => {
    const url = user ? "/loyalty/me" : "/loyalty/config";
    api.get(url).then((r) => setData(r.data)).catch(() => {});
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  if (!data) return <p className="text-slate-400 text-center py-10">Chargement…</p>;
  if (!data.enabled) return <p className="text-slate-400 text-center py-10">Le programme de fidélité est actuellement indisponible.</p>;

  const redeem = async (reward) => {
    setBusy(reward.id);
    try {
      const { data: res } = await api.post("/loyalty/redeem", { reward_id: reward.id });
      toast.success(`Récompense échangée ! Code : ${res.code}`);
      await refresh();
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Échec de l'échange");
    } finally { setBusy(null); }
  };

  const copy = (code) => { navigator.clipboard?.writeText(code); setCopied(code); toast.success("Code copié"); setTimeout(() => setCopied(""), 1500); };

  const tier = data.tier;
  const next = data.next_tier;
  const lifetime = data.lifetime || 0;
  const progress = next ? Math.min(100, Math.round(((lifetime - (tier?.min || 0)) / (next.min - (tier?.min || 0))) * 100)) : 100;
  const TierIcon = TIER_ICON[tier?.name] || Award;

  return (
    <div className="space-y-8" data-testid="loyalty-content">
      {/* Points / status card */}
      {user ? (
        <div className="rounded-3xl bg-gradient-to-br from-mint-600 to-mint-700 text-white p-6 sm:p-8 shadow-lg shadow-mint-600/30" data-testid="loyalty-summary">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-mint-100 text-sm">Vos points fidélité</div>
              <div className="font-display font-extrabold text-4xl sm:text-5xl" data-testid="loyalty-points">{data.points}</div>
              <div className="text-mint-100 text-sm mt-1">points disponibles</div>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur`} data-testid="loyalty-tier">
              <TierIcon className="w-5 h-5" /> <span className="font-bold">Statut {tier?.name}</span>
            </div>
          </div>
          {next && (
            <div className="mt-6">
              <div className="flex justify-between text-xs text-mint-100 mb-1">
                <span>{lifetime} pts cumulés</span>
                <span>Plus que {Math.max(0, next.min - lifetime)} pts pour {next.name}</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl bg-mint-50 border border-mint-100 p-6 sm:p-8 text-center" data-testid="loyalty-cta">
          <Sparkles className="w-10 h-10 text-mint-600 mx-auto mb-3" />
          <h2 className="font-display font-extrabold text-xl mb-2">Cumulez des points à chaque commande</h2>
          <p className="text-slate-500 mb-5">Connectez-vous pour rejoindre le programme de fidélité Pharma360 et transformez vos achats en récompenses.</p>
          <Link to="/compte" data-testid="loyalty-login-link" className="inline-block px-6 py-3 rounded-full bg-mint-600 text-white font-semibold hover:bg-mint-700">Se connecter / S'inscrire</Link>
        </div>
      )}

      {/* How it works */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: Gift, t: "1. Achetez", d: `Gagnez ${data.points_per_100da} point par tranche de 100 DA d'achats.` },
          { icon: Check, t: "2. À la livraison", d: "Vos points sont crédités dès que votre commande est livrée." },
          { icon: Award, t: "3. Échangez", d: "Utilisez vos points contre des bons de réduction." },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-5">
            <s.icon className="w-6 h-6 text-mint-600 mb-2" />
            <div className="font-semibold text-sm">{s.t}</div>
            <div className="text-sm text-slate-500 mt-1">{s.d}</div>
          </div>
        ))}
      </div>

      {/* Tiers */}
      <div>
        <h3 className="font-display font-bold text-lg mb-3">Nos statuts</h3>
        <div className="grid grid-cols-3 gap-3">
          {(data.tiers || []).map((t) => {
            const Icon = TIER_ICON[t.name] || Award;
            const active = tier?.name === t.name;
            return (
              <div key={t.name} className={`rounded-2xl border p-4 text-center ${active ? "border-mint-500 bg-mint-50/60" : "border-slate-200/80 bg-white"}`}>
                <span className={`w-10 h-10 rounded-full grid place-items-center mx-auto mb-2 ${TIER_COLOR[t.name] || "bg-slate-100 text-slate-500"}`}><Icon className="w-5 h-5" /></span>
                <div className="font-bold text-sm">{t.name}</div>
                <div className="text-xs text-slate-400">dès {t.min} pts</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rewards */}
      <div>
        <h3 className="font-display font-bold text-lg mb-3">Récompenses</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="loyalty-rewards">
          {(data.rewards || []).map((r) => {
            const affordable = user && data.points >= r.points;
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col" data-testid={`reward-${r.id}`}>
                <Gift className="w-7 h-7 text-mint-600 mb-2" />
                <div className="font-semibold">{r.label}</div>
                <div className="text-sm text-slate-500 mb-4">{r.points} points</div>
                <button
                  onClick={() => redeem(r)}
                  disabled={!affordable || busy === r.id}
                  data-testid={`reward-redeem-${r.id}`}
                  className="mt-auto py-2.5 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                  {busy === r.id ? "…" : !user ? "Connectez-vous" : affordable ? "Échanger" : "Points insuffisants"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* My codes */}
      {user && data.my_codes && data.my_codes.length > 0 && (
        <div>
          <h3 className="font-display font-bold text-lg mb-3">Mes bons de réduction</h3>
          <div className="space-y-2" data-testid="loyalty-my-codes">
            {data.my_codes.map((c) => (
              <div key={c.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${c.active ? "border-mint-200 bg-mint-50/40" : "border-slate-200 bg-slate-50 opacity-60"}`}>
                <div>
                  <div className="font-mono font-bold text-mint-700">{c.code}</div>
                  <div className="text-xs text-slate-500">{c.reward_label} {c.active ? "" : "· utilisé"}</div>
                </div>
                {c.active && (
                  <button onClick={() => copy(c.code)} className="flex items-center gap-1.5 text-sm text-mint-700 font-semibold">
                    {copied === c.code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copier
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">Saisissez ce code lors du paiement pour bénéficier de votre réduction.</p>
        </div>
      )}
      {/* Referral */}
      {user && data.referral && data.referral.enabled && (
        <div className="rounded-3xl border border-mint-200 bg-mint-50/50 p-6 sm:p-8" data-testid="loyalty-referral">
          <div className="flex items-start gap-3 mb-4">
            <span className="w-11 h-11 rounded-full bg-mint-600 grid place-items-center shrink-0"><Sparkles className="w-5 h-5 text-white" /></span>
            <div>
              <h3 className="font-display font-bold text-lg">Parrainez vos amis</h3>
              <p className="text-sm text-slate-600">Partagez votre code : votre filleul reçoit <b>{data.referral.referee_points} points</b> de bienvenue et vous gagnez <b>{data.referral.referrer_points} points</b> dès son inscription.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[180px] px-4 py-3 rounded-xl bg-white border border-mint-200 font-mono font-bold text-mint-700 text-center tracking-wider" data-testid="referral-code">{data.referral.code}</div>
            <button onClick={() => copy(data.referral.code)} data-testid="referral-copy" className="flex items-center gap-1.5 px-5 py-3 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold text-sm">
              {copied === data.referral.code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copier mon code
            </button>
          </div>
          {data.referral.count > 0 && <p className="text-sm text-mint-700 mt-3 font-semibold" data-testid="referral-count">{data.referral.count} filleul{data.referral.count > 1 ? "s" : ""} parrainé{data.referral.count > 1 ? "s" : ""}</p>}
        </div>
      )}
    </div>
  );
}

export default function Loyalty() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10" data-testid="loyalty-page">
      <div className="text-center mb-8">
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl">Programme de fidélité</h1>
        <p className="text-slate-500 mt-2">Chaque achat vous rapproche de vos récompenses.</p>
      </div>
      <LoyaltyContent />
    </div>
  );
}
