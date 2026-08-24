import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gift, Award, Sparkles, Crown, Star, Copy, Check, Percent, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import api, { formatDA, mediaUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

const TIER_ICON = { BRONZE: Award, Silver: Star, Gold: Crown };
const TIER_COLOR = { BRONZE: "text-amber-700 bg-amber-100", Silver: "text-slate-500 bg-slate-100", Gold: "text-yellow-600 bg-yellow-100" };

export function LoyaltyContent() {
  const { user, refresh } = useAuth();
  const { addItem } = useCart();
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

  const claimGift = async (tierName, gift) => {
    setBusy(`gift-${gift.id}`);
    try {
      const { data: res } = await api.post("/loyalty/claim-gift", { tier: tierName, gift_id: gift.id });
      toast.success(`Cadeau réclamé ! Votre code : ${res.code}`);
      await refresh(); load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Échec de la réclamation");
    } finally { setBusy(null); }
  };

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
  const points = data.points || 0;
  const progress = next ? Math.min(100, Math.round(((points - (tier?.min || 0)) / (next.min - (tier?.min || 0))) * 100)) : 100;
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
              <TierIcon className="w-5 h-5" /> <span className="font-bold">{tier ? `Statut ${tier.name}` : "Nouveau membre"}</span>
            </div>
          </div>
          {next && (
            <div className="mt-6">
              <div className="flex justify-between text-xs text-mint-100 mb-1">
                <span>{points} pts actuels</span>
                <span>Plus que {Math.max(0, next.min - points)} pts pour {next.name}</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          {tier?.perks?.length > 0 && (
            <div className="mt-6 pt-5 border-t border-white/15" data-testid="loyalty-tier-perks">
              <div className="text-mint-100 text-xs font-semibold uppercase tracking-wide mb-2">Vos avantages {tier.name}</div>
              <ul className="space-y-1.5">
                {tier.perks.map((p, i) => <li key={i} className="flex items-start gap-2 text-sm"><Check className="w-4 h-4 mt-0.5 shrink-0" /> {p}</li>)}
              </ul>
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

      {/* Status gifts — congratulations + gift chooser (one gift per tier) */}
      {user && (data.gift_tiers || []).some((gt) => gt.gifts.length > 0) && (
        <div className="space-y-4" data-testid="loyalty-gifts">
          {(data.gift_tiers || []).filter((gt) => gt.gifts.length > 0).map((gt) => (
            <div key={gt.tier} className="rounded-3xl border-2 border-mint-200 bg-gradient-to-br from-mint-50 to-white p-6" data-testid={`gift-tier-${gt.tier}`}>
              <div className="flex items-center gap-2 mb-1">
                <PartyPopper className="w-6 h-6 text-mint-600" />
                <h3 className="font-display font-extrabold text-lg">Félicitations ! Vous êtes {gt.tier}</h3>
              </div>
              {gt.claimed ? (
                <div className="mt-3 rounded-2xl bg-white border border-mint-200 p-4" data-testid={`gift-claimed-${gt.tier}`}>
                  <p className="text-sm text-slate-600 mb-2">Vous avez choisi votre cadeau <b>{gt.claimed_gift_name}</b>. Utilisez ce code au paiement pour le recevoir gratuitement avec votre commande :</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-4 py-2 rounded-xl bg-mint-600 text-white font-mono font-bold tracking-wider" data-testid={`gift-code-${gt.tier}`}>{gt.claimed_code}</span>
                    <button onClick={() => copy(gt.claimed_code)} className="flex items-center gap-1.5 text-sm text-mint-700 font-semibold">
                      {copied === gt.claimed_code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copier
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600 mb-3">Choisissez <b>un</b> cadeau offert pour ce statut (un seul cadeau par statut) :</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {gt.gifts.map((g) => (
                      <div key={g.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col items-center text-center" data-testid={`gift-option-${g.id}`}>
                        {g.image ? <img src={mediaUrl(g.image)} alt={g.name} className="w-20 h-20 rounded-xl object-cover mb-2 bg-mint-50" /> : <span className="w-20 h-20 rounded-xl bg-mint-50 grid place-items-center mb-2"><Gift className="w-8 h-8 text-mint-500" /></span>}
                        <div className="font-semibold text-sm line-clamp-2 flex-1">{g.name}</div>
                        <button onClick={() => claimGift(gt.tier, g)} disabled={busy === `gift-${g.id}`} data-testid={`gift-claim-${g.id}`}
                          className="mt-3 w-full py-2 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold text-sm disabled:opacity-40">
                          {busy === `gift-${g.id}` ? "…" : "Choisir ce cadeau"}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Exclusive tier offers */}
      {user && (data.offers || []).length > 0 && (
        <div data-testid="loyalty-offers">
          <h3 className="font-display font-bold text-lg mb-1 flex items-center gap-2"><Percent className="w-5 h-5 text-mint-600" /> Offres exclusives {tier?.name}</h3>
          <p className="text-sm text-slate-500 mb-3">Réservées à votre statut. La réduction est appliquée automatiquement à la commande.</p>
          <div className="space-y-4">
            {data.offers.map((o) => (
              <div key={o.id} className="rounded-2xl border border-mint-200 bg-mint-50/40 p-4" data-testid={`offer-${o.id}`}>
                <div className="font-semibold mb-3 flex items-center gap-2"><span className="px-2 py-0.5 rounded-full bg-mint-600 text-white text-xs font-bold">-{o.discount_value}{o.discount_type === "percent" ? "%" : " DA"}</span> {o.title}</div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {o.products.map((p) => (
                    <div key={p.id} className="bg-white rounded-2xl border border-slate-200/80 p-3 flex flex-col" data-testid={`offer-product-${p.id}`}>
                      <img src={mediaUrl(p.images?.[0])} alt={p.name} className="w-full h-24 rounded-xl object-cover bg-mint-50 mb-2" />
                      <div className="text-sm font-medium line-clamp-2 flex-1">{p.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-mint-700 font-bold">{formatDA(p.offer_price)}</span>
                        <span className="text-xs text-slate-400 line-through">{formatDA(p.original_price)}</span>
                      </div>
                      <button onClick={() => { addItem({ ...p, price: p.offer_price }, 1); toast.success("Ajouté au panier au prix membre"); }} data-testid={`offer-add-${p.id}`}
                        className="mt-2 w-full py-2 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold text-sm">Ajouter au panier</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(data.tiers || []).map((t) => {
            const Icon = TIER_ICON[t.name] || Award;
            const active = tier?.name === t.name;
            return (
              <div key={t.name} className={`rounded-2xl border p-4 ${active ? "border-mint-500 bg-mint-50/60" : "border-slate-200/80 bg-white"}`} data-testid={`tier-card-${t.name}`}>
                <div className="text-center">
                  <span className={`w-10 h-10 rounded-full grid place-items-center mx-auto mb-2 ${TIER_COLOR[t.name] || "bg-slate-100 text-slate-500"}`}><Icon className="w-5 h-5" /></span>
                  <div className="font-bold text-sm">{t.name}</div>
                  <div className="text-xs text-slate-400">dès {t.min} pts</div>
                </div>
                {t.perks?.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                    {t.perks.map((p, i) => <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600"><Check className="w-3.5 h-3.5 text-mint-600 mt-0.5 shrink-0" /> {p}</li>)}
                  </ul>
                )}
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
