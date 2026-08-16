import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Truck, CreditCard, Sparkles } from "lucide-react";
import api, { mediaUrl } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { useSettings } from "@/context/SettingsContext";
import { useCategories } from "@/context/CategoriesContext";

function SectionHeader({ title, subtitle, to }) {
  return (
    <div className="flex items-end justify-between mb-6 gap-4">
      <div>
        <h2 className="font-display font-extrabold text-2xl sm:text-3xl md:text-4xl text-slate-dark">{title}</h2>
        {subtitle && <p className="text-slate-500 text-sm sm:text-base mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {to && <Link to={to} className="hidden sm:flex items-center gap-1 text-mint-700 font-semibold text-sm hover:gap-2 transition-all shrink-0">Voir tout <ArrowRight className="w-4 h-4" /></Link>}
    </div>
  );
}

function Grid({ products }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}

export default function Home() {
  const { settings } = useSettings();
  const { categories } = useCategories();
  const [promos, setPromos] = useState([]);
  const [news, setNews] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [brands, setBrands] = useState([]);
  const [blog, setBlog] = useState([]);

  useEffect(() => {
    api.get("/products?on_promo=1&limit=8").then((r) => setPromos(r.data));
    api.get("/products?is_new=1&limit=8").then((r) => setNews(r.data));
    api.get("/products?featured=1&limit=8").then((r) => setFeatured(r.data));
    api.get("/brands").then((r) => setBrands(r.data));
    api.get("/blog").then((r) => setBlog(r.data.slice(0, 3)));
  }, []);

  return (
    <div className="animate-fade-up">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-mint-50 via-white to-mint-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16 grid lg:grid-cols-2 gap-8 items-center">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-mint-600/10 text-mint-700 text-xs font-semibold font-mono-label mb-5">
              <Sparkles className="w-3.5 h-3.5" /> Offres du moment · Parapharmacie Algérie
            </span>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-slate-dark leading-[1.05]">
              {settings.hero_title || "Prenez soin de votre peau & santé au meilleur prix"}
            </h1>
            <p className="text-slate-600 text-base sm:text-lg mt-5 max-w-lg">{settings.hero_subtitle}</p>
            <div className="flex flex-wrap gap-3 mt-7">
              <Link to="/catalogue?on_promo=1" data-testid="hero-cta-promos" className="px-6 py-3.5 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold shadow-lg shadow-mint-600/30 transition-colors">Découvrir les promos</Link>
              <Link to="/catalogue" className="px-6 py-3.5 rounded-full bg-white border border-mint-200 text-slate-dark font-semibold hover:border-mint-400 transition-colors">Tout le catalogue</Link>
            </div>
            <div className="flex flex-wrap gap-4 mt-8">
              {[[Truck, "Livraison partout en Algérie"], [CreditCard, "Paiement à la livraison"], [ShieldCheck, "100% Certifié"]].map(([Icon, t], i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-600"><Icon className="w-4 h-4 text-mint-600" />{t}</div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-mint-900/20 aspect-[4/3]">
              <img src={settings.hero_image ? mediaUrl(settings.hero_image) : "https://images.unsplash.com/photo-1728727267814-792db55ce678?w=900"} alt="Soin visage Pharma360" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl p-4 hidden sm:block">
              <div className="text-xs text-slate-400 font-mono-label">Jusqu'à</div>
              <div className="font-display font-extrabold text-2xl text-red-500">-50%</div>
              <div className="text-xs text-slate-500">sur une sélection</div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-14 sm:space-y-20 py-12 sm:py-16">
        {promos.length > 0 && (
          <section data-testid="section-offres">
            <SectionHeader title="🔥 Nos Offres" subtitle="Réductions exclusives avec prix barrés en Dinar Algérien" to="/catalogue?on_promo=1" />
            <Grid products={promos} />
          </section>
        )}

        {news.length > 0 && (
          <section data-testid="section-nouveautes">
            <SectionHeader title="✨ Nouvel Arrivage" subtitle="Les derniers soins et innovations beauté chez Pharma360" to="/catalogue?is_new=1" />
            <Grid products={news} />
          </section>
        )}

        {/* Categories */}
        <section data-testid="section-categories">
          <SectionHeader title="Des catégories pour chaque besoin" subtitle="Trouvez le soin adapté à vos besoins spécifiques" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
            {categories.map((c) => (
              <Link key={c.id} to={`/categorie/${c.id}`} data-testid={`home-category-${c.id}`}
                className="group relative aspect-[4/5] sm:aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all">
                <img src={mediaUrl(c.image)} alt={c.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent" />
                <span className="absolute bottom-3 left-3 right-3 font-display font-bold text-white text-base sm:text-lg leading-tight">{c.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {featured.length > 0 && (
          <section data-testid="section-coups-de-coeur">
            <SectionHeader title="💚 Nos Coups de Cœur" subtitle="Sélectionnés et approuvés par nos pharmaciens experts" to="/catalogue?featured=1" />
            <Grid products={featured} />
          </section>
        )}

        {/* Brands */}
        {brands.length > 0 && (
          <section data-testid="section-marques">
            <SectionHeader title="Nos Marques de Référence" subtitle="Les plus grands laboratoires disponibles en Algérie" to="/marques" />
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4">
              {brands.slice(0, 10).map((b) => (
                <Link key={b.id} to={`/marque/${b.id}`} data-testid={`home-brand-${b.id}`}
                  className="aspect-[3/2] rounded-2xl bg-white border border-slate-200/80 hover:border-mint-400 hover:shadow-md grid place-items-center p-4 transition-all">
                  {b.logo ? <img src={mediaUrl(b.logo)} alt={b.name} className="max-h-full max-w-full object-contain" /> :
                    <span className="font-display font-bold text-slate-700 text-center text-sm sm:text-base">{b.name}</span>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Blog */}
        {blog.length > 0 && (
          <section data-testid="section-blog">
            <SectionHeader title="Conseils & Astuces" subtitle="Guides rédigés par nos spécialistes pour prendre soin de vous" to="/blog" />
            <div className="grid sm:grid-cols-3 gap-5">
              {blog.map((post) => (
                <Link key={post.id} to={`/blog/${post.id}`} className="group bg-white rounded-2xl overflow-hidden border border-slate-200/80 hover:shadow-xl transition-all">
                  <div className="aspect-[16/10] overflow-hidden bg-mint-50">
                    <img src={mediaUrl(post.image)} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-mint-600 font-mono-label mb-2">{post.author}</div>
                    <h3 className="font-display font-bold text-slate-dark leading-snug line-clamp-2 group-hover:text-mint-700 transition-colors">{post.title}</h3>
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">{post.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
