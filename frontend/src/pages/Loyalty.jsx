import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, Sparkles, Gift, Tag, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const EASE = [0.22, 1, 0.36, 1];

export default function Loyalty() {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);

  useEffect(() => {
    api.get("/loyalty/config").then((r) => setConfig(r.data)).catch(() => {});
  }, []);

  return (
    <div className="pb-24 pt-32" data-testid="loyalty-page">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }} className="max-w-3xl">
          <p className="badge-mono text-terra">Programme Privilège L'olivier</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-obsidian sm:text-4xl lg:text-5xl">
            Chaque commande vous rapproche du statut Gold.
          </h1>
          {config && <p className="mt-5 text-base leading-relaxed text-stone2">{config.points_rule}. Les points se cumulent automatiquement et votre statut est mis à jour en temps réel.</p>}
        </motion.div>

        <div className="mt-8 grid gap-4 rounded-3xl border bg-white p-8 sm:grid-cols-3" data-testid="how-it-works">
          {[
            ["1", "Créez votre compte", "Gratuit, en 30 secondes. Vous êtes immédiatement membre Bronze."],
            ["2", "Cumulez des points", "1 point pour 100 DA d'achat, crédités automatiquement à la livraison."],
            ["3", "Débloquez des privilèges", "Cadeaux, offres exclusives et avantages réservés à chaque statut."],
          ].map(([n, t, d]) => (
            <div key={n} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-pale font-serif text-lg font-semibold text-brand">{n}</span>
              <div>
                <p className="font-semibold text-obsidian">{t}</p>
                <p className="mt-1 text-sm text-stone2">{d}</p>
              </div>
            </div>
          ))}
        </div>

        {config && (
          <div className="mt-14 grid gap-6 lg:grid-cols-3" data-testid="tiers-grid">
            {config.tiers.map((t, i) => (
              <motion.div key={t.key}
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.7, ease: EASE }}
                className={`card-lift relative overflow-hidden rounded-[2rem] border bg-white p-8 ${t.key === "gold" ? "ring-2 ring-gold" : ""}`}
                data-testid={`loyalty-tier-${t.key}`}>
                {t.key === "gold" && (
                  <span className="absolute right-5 top-5 rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-obsidian">Le plus exclusif</span>
                )}
                <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-white" style={{ background: t.color }}>
                  <Award size={14} /> {t.name}
                </span>
                <p className="mt-4 font-mono text-sm text-stone2">dès <span className="font-semibold text-obsidian">{t.min.toLocaleString("fr-FR")}</span> points</p>

                <p className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone2"><Gift size={13} style={{ color: t.color }} /> Cadeaux</p>
                <ul className="mt-2.5 space-y-2">
                  {t.gifts.map((g) => (
                    <li key={g} className="flex items-start gap-2 text-sm text-obsidian/85">
                      <Sparkles size={13} className="mt-0.5 shrink-0" style={{ color: t.color }} /> {g}
                    </li>
                  ))}
                </ul>

                <p className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone2"><Tag size={13} style={{ color: t.color }} /> Offres exclusives</p>
                <ul className="mt-2.5 space-y-2">
                  {t.offers.map((o) => (
                    <li key={o} className="flex items-start gap-2 text-sm text-obsidian/85">
                      <Sparkles size={13} className="mt-0.5 shrink-0" style={{ color: t.color }} /> {o}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-16 flex flex-col items-center gap-5 rounded-[2rem] bg-obsidian p-12 text-center text-bone grain">
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">Prêt à être récompensé ?</h2>
          <p className="max-w-md text-sm text-bone/60">Inscription gratuite, prix membres immédiats sur tout le catalogue.</p>
          {user ? (
            <Link to="/compte" className="btn-brand !bg-gold !text-obsidian hover:!opacity-90" data-testid="loyalty-cta-account">
              Voir mes points <ArrowRight size={15} />
            </Link>
          ) : (
            <Link to="/auth" className="btn-brand !bg-gold !text-obsidian hover:!opacity-90" data-testid="loyalty-cta-join">
              Rejoindre le programme <ArrowRight size={15} />
            </Link>
          )}
        </motion.div>
      </div>
    </div>
  );
}
