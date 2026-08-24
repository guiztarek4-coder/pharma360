import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Leaf, ArrowRight, Phone, MapPin, Instagram, Clock, Sparkles, ShieldCheck, Truck, Award } from "lucide-react";
import { api } from "@/lib/api";
import { useSite } from "@/context/SiteContext";
import { IMAGES } from "@/lib/images";
import ProductCard from "@/components/ProductCard";

const EASE = [0.22, 1, 0.36, 1];

const MARQUEE_ITEMS = [
  "Produits 100% Certifiés", "Conseil Pharmacien 24/7", "Livraison Express",
  "Programme Privilège Bronze · Silver · Gold", "Ouvert 7j/7 — 24h/24", "Paiement à la livraison",
];

const CHAPTERS = [
  {
    num: "01", title: "Sourcing Naturel", image: IMAGES.chapter_1,
    text: "Chaque formule est sélectionnée pour la pureté de ses actifs botaniques — olive, karité, aloe vera — sourcés auprès de producteurs certifiés.",
  },
  {
    num: "02", title: "Rigueur Pharmacologique", image: IMAGES.chapter_2,
    text: "Derrière chaque produit, l'œil d'un pharmacien. Validation dermatologique, traçabilité des lots, conseil professionnel à toute heure.",
  },
  {
    num: "03", title: "Engagement Local", image: IMAGES.hero_main,
    text: "Ouverts 7j/7 et 24h/24 à Saïd Hamdine, nous sommes la parapharmacie de quartier qui ne dort jamais — avec livraison express et paiement à la livraison.",
  },
];

function MaskedLine({ children, delay = 0 }) {
  return (
    <span className="block overflow-hidden pb-1">
      <motion.span
        className="block"
        initial={{ y: "110%" }}
        animate={{ y: 0 }}
        transition={{ delay, duration: 0.9, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function Reveal({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay, duration: 0.8, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const { settings } = useSite();
  const [featured, setFeatured] = useState([]);
  const [loyalty, setLoyalty] = useState(null);
  const { scrollY } = useScroll();
  const heroImgY = useTransform(scrollY, [0, 700], [0, 130]);
  const heroCardY = useTransform(scrollY, [0, 700], [0, -60]);
  const c = settings.contact;

  useEffect(() => {
    api.get("/products", { params: { featured: true } }).then((r) => setFeatured(r.data)).catch(() => {});
    api.get("/loyalty/config").then((r) => setLoyalty(r.data)).catch(() => {});
  }, []);

  return (
    <div data-testid="home-page">
      {/* HERO */}
      <section className="relative overflow-hidden pt-32 pb-16 sm:pt-40 lg:pb-24 grain" data-testid="hero-section">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-brand-pale blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-brand/25 bg-white/70 px-4 py-2 backdrop-blur"
              data-testid="hero-open-badge"
            >
              <span className="pulse-dot h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs font-semibold text-brand">Ouvert {c.hours}</span>
            </motion.div>

            <h1 className="font-serif text-4xl font-medium leading-[1.05] tracking-tight text-obsidian sm:text-5xl lg:text-6xl" data-testid="hero-title">
              <MaskedLine delay={0.15}>L'Excellence</MaskedLine>
              <MaskedLine delay={0.3}><em className="text-brand">Botanique</em> au service</MaskedLine>
              <MaskedLine delay={0.45}>de votre santé.</MaskedLine>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.8, ease: EASE }}
              className="mt-7 max-w-lg text-base leading-relaxed text-stone2"
            >
              Parapharmacie d'exception à Saïd Hamdine : soins visage, dermatologie, hygiène, compléments et puériculture — sélectionnés avec la rigueur d'un pharmacien, livrés à votre porte.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8, ease: EASE }}
              className="mt-9 flex flex-wrap items-center gap-4"
            >
              <Link to="/catalogue" className="btn-brand" data-testid="hero-cta-catalogue">
                Découvrir le catalogue <ArrowRight size={16} />
              </Link>
              <Link to="/fidelite" className="btn-outline" data-testid="hero-cta-fidelite">
                <Sparkles size={15} /> Programme fidélité
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.15, duration: 1 }}
              className="mt-12 flex flex-wrap gap-8 border-t border-obsidian/10 pt-7"
              data-testid="hero-stats"
            >
              {[["250+", "Références certifiées"], ["24/7", "Conseil pharmacien"], ["3", "Statuts privilège"]].map(([v, l]) => (
                <div key={l}>
                  <p className="font-serif text-3xl font-semibold text-brand">{v}</p>
                  <p className="badge-mono mt-1 text-stone2">{l}</p>
                </div>
              ))}
            </motion.div>
          </div>

          <div className="relative lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1.1, ease: EASE }}
              className="relative"
            >
              <motion.div style={{ y: heroImgY }} className="overflow-hidden rounded-[2.5rem] rounded-tr-[6rem] border-8 border-white shadow-2xl">
                <img src={IMAGES.hero_main} alt="Botanique L'olivier" className="aspect-[4/5] w-full object-cover" data-testid="hero-image" />
              </motion.div>
              <motion.div
                style={{ y: heroCardY }}
                className="absolute -bottom-8 -left-6 rounded-3xl border bg-white/90 p-5 shadow-xl backdrop-blur-xl sm:-left-12"
                data-testid="hero-floating-card"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-pale text-brand"><ShieldCheck size={20} /></span>
                  <div>
                    <p className="text-sm font-bold text-obsidian">Conseil Pharmacien</p>
                    <p className="text-xs text-stone2">Disponible 24h/24 — chat en direct</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2, duration: 0.8 }}
                className="absolute -right-3 top-8 hidden rounded-2xl bg-obsidian px-4 py-3 text-bone shadow-lg sm:block"
              >
                <p className="font-mono text-[10px] uppercase tracking-widest text-bone/50">Prix membres</p>
                <p className="font-serif text-lg font-semibold text-gold">jusqu'à -20%</p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="overflow-hidden border-y border-bone/10 bg-obsidian py-5" data-testid="marquee-section">
        <div className="marquee-track">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 items-center" aria-hidden={dup === 1}>
              {MARQUEE_ITEMS.map((item) => (
                <span key={`${dup}-${item}`} className="flex items-center">
                  <span className="whitespace-nowrap px-8 font-serif text-lg italic text-bone/70">{item}</span>
                  <Leaf size={14} className="shrink-0 text-brand" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="mx-auto max-w-7xl px-6 py-24" data-testid="featured-section">
        <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="badge-mono text-terra">Sélection du moment</p>
            <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight text-obsidian sm:text-3xl lg:text-4xl">
              Nos essentiels botaniques
            </h2>
          </div>
          <Link to="/catalogue" data-testid="featured-see-all" className="group flex items-center gap-2 text-sm font-semibold text-brand">
            Voir tout le catalogue
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="featured-grid">
          {featured.slice(0, 6).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="bg-sand py-24" data-testid="manifesto-section">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal className="mb-16 max-w-2xl">
            <p className="badge-mono text-terra">Notre manifeste botanique</p>
            <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight text-obsidian sm:text-3xl lg:text-4xl">
              Trois engagements, une seule exigence.
            </h2>
          </Reveal>
          <div className="space-y-20">
            {CHAPTERS.map((ch, i) => (
              <Reveal key={ch.num}>
                <div className={`grid items-center gap-10 lg:grid-cols-2 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                  <div className="relative">
                    <span className="pointer-events-none absolute -top-10 left-0 font-serif text-[7rem] font-semibold leading-none text-brand/10 select-none">{ch.num}</span>
                    <div className="relative overflow-hidden rounded-[2rem] shadow-xl">
                      <img src={ch.image} alt={ch.title} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-105" />
                    </div>
                  </div>
                  <div className={i % 2 === 1 ? "lg:pr-10" : "lg:pl-10"}>
                    <p className="font-mono text-sm font-semibold text-terra">{ch.num}.</p>
                    <h3 className="mt-2 font-serif text-xl font-semibold text-obsidian sm:text-2xl">{ch.title}</h3>
                    <p className="mt-4 max-w-md text-base leading-relaxed text-stone2">{ch.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* LOYALTY TEASER */}
      {loyalty && (
        <section className="mx-auto max-w-7xl px-6 py-24" data-testid="loyalty-teaser">
          <Reveal className="mb-12 text-center">
            <p className="badge-mono text-terra">Programme Privilège</p>
            <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight text-obsidian sm:text-3xl lg:text-4xl">
              Votre fidélité, récompensée à chaque commande
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-stone2">{loyalty.points_rule}</p>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {loyalty.tiers.map((t, i) => (
              <Reveal key={t.key} delay={i * 0.12}>
                <div className="card-lift relative h-full overflow-hidden rounded-3xl border bg-white p-8" data-testid={`tier-card-${t.key}`}>
                  <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full opacity-15" style={{ background: t.color }} />
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white" style={{ background: t.color }}>
                    <Award size={12} /> {t.name}
                  </span>
                  <p className="mt-4 font-mono text-sm text-stone2">dès {t.min.toLocaleString("fr-FR")} points</p>
                  <ul className="mt-5 space-y-2.5">
                    {t.gifts.map((g) => (
                      <li key={g} className="flex items-start gap-2 text-sm text-obsidian/80">
                        <Sparkles size={14} className="mt-0.5 shrink-0" style={{ color: t.color }} /> {g}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.3} className="mt-10 text-center">
            <Link to="/fidelite" className="btn-brand" data-testid="loyalty-teaser-cta">
              Découvrir tous les avantages <ArrowRight size={16} />
            </Link>
          </Reveal>
        </section>
      )}

      {/* CONTACT BAND */}
      <section id="contact-band" className="relative overflow-hidden bg-obsidian py-20 text-bone grain" data-testid="contact-section">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <p className="badge-mono text-terra">Nous trouver, nous appeler</p>
                <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
                  Une équipe qui ne dort jamais.
                </h2>
                <p className="mt-4 max-w-md text-base text-bone/60">
                  Ouverts 7j/7, 24h/24. Appelez-nous, écrivez-nous sur le chat, ou passez nous voir à Saïd Hamdine.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {c.phones.map((p) => (
                  <a key={p} href={`tel:${p}`} data-testid={`contact-phone-${p}`}
                    className="card-lift flex items-center gap-3 rounded-2xl border border-bone/15 bg-bone/5 p-5 backdrop-blur transition-colors hover:border-terra">
                    <Phone size={18} className="text-terra" />
                    <div>
                      <p className="badge-mono text-bone/40">Téléphone</p>
                      <p className="font-mono text-sm font-semibold">{p}</p>
                    </div>
                  </a>
                ))}
                <a href={c.maps_url} target="_blank" rel="noreferrer" data-testid="contact-maps"
                  className="card-lift flex items-center gap-3 rounded-2xl border border-bone/15 bg-bone/5 p-5 backdrop-blur transition-colors hover:border-terra">
                  <MapPin size={18} className="text-terra" />
                  <div>
                    <p className="badge-mono text-bone/40">Adresse</p>
                    <p className="text-sm font-semibold">{c.address_label}</p>
                  </div>
                </a>
                <a href={c.instagram} target="_blank" rel="noreferrer" data-testid="contact-instagram"
                  className="card-lift flex items-center gap-3 rounded-2xl border border-bone/15 bg-bone/5 p-5 backdrop-blur transition-colors hover:border-terra">
                  <Instagram size={18} className="text-terra" />
                  <div>
                    <p className="badge-mono text-bone/40">Instagram</p>
                    <p className="text-sm font-semibold">{c.instagram_handle}</p>
                  </div>
                </a>
                <div className="flex items-center gap-3 rounded-2xl border border-bone/15 bg-bone/5 p-5">
                  <Clock size={18} className="text-terra" />
                  <div>
                    <p className="badge-mono text-bone/40">Horaires</p>
                    <p className="text-sm font-semibold">{c.hours}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-bone/15 bg-bone/5 p-5">
                  <Truck size={18} className="text-terra" />
                  <div>
                    <p className="badge-mono text-bone/40">Livraison</p>
                    <p className="text-sm font-semibold">Express — paiement à la livraison</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
