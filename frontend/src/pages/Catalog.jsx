import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ProductCard from "@/components/ProductCard";

export default function Catalog() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const activeCat = searchParams.get("categorie") || "";
  const activeSub = searchParams.get("sc") || "";

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (activeCat) params.category = activeCat;
    if (activeSub) params.subcategory = activeSub;
    if (search) params.search = search;
    api.get("/products", { params })
      .then((r) => setProducts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeCat, activeSub, search]);

  return (
    <div className="mx-auto max-w-7xl px-6 pb-24 pt-32" data-testid="catalog-page">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
        <p className="badge-mono text-terra">Catalogue</p>
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-obsidian sm:text-4xl lg:text-5xl">
          Toute la parapharmacie, au prix membre.
        </h1>
        {!user && (
          <Link to="/auth" data-testid="member-banner"
            className="mt-6 flex max-w-xl items-center gap-3 rounded-2xl border border-brand/25 bg-brand-pale p-4 transition-all hover:shadow-md">
            <Sparkles size={18} className="shrink-0 text-brand" />
            <p className="text-sm text-brand">
              <strong>Créez votre compte gratuit</strong> pour profiter immédiatement des Prix Membres affichés et cumuler des points fidélité.
            </p>
          </Link>
        )}
      </motion.div>

      <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" data-testid="category-filters">
          <button onClick={() => setSearchParams({})} data-testid="filter-all"
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${!activeCat ? "bg-brand text-bone" : "border bg-white text-obsidian/70 hover:border-brand hover:text-brand"}`}>
            Tout
          </button>
          {categories.map((cat) => (
            <button key={cat.name} onClick={() => setSearchParams({ categorie: cat.name })} data-testid={`filter-${cat.name.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${activeCat === cat.name ? "bg-brand text-bone" : "border bg-white text-obsidian/70 hover:border-brand hover:text-brand"}`}>
              {cat.name}
            </button>
          ))}
        </div>
        <div className="relative lg:w-72">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit…"
            data-testid="catalog-search" className="input-field !pl-10" />
        </div>
      </div>

      {activeCat && (categories.find((c) => c.name === activeCat)?.subcategories?.length > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-2" data-testid="subcategory-filters">
          <span className="badge-mono mr-1 text-stone2">Sous-catégories :</span>
          <button onClick={() => setSearchParams({ categorie: activeCat })} data-testid="subfilter-all"
            className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all ${!activeSub ? "bg-terra text-white" : "border bg-white text-obsidian/70 hover:border-terra hover:text-terra"}`}>
            Toutes
          </button>
          {categories.find((c) => c.name === activeCat).subcategories.map((sc) => (
            <button key={sc} onClick={() => setSearchParams({ categorie: activeCat, sc })} data-testid={`subfilter-${sc.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all ${activeSub === sc ? "bg-terra text-white" : "border bg-white text-obsidian/70 hover:border-terra hover:text-terra"}`}>
              {sc}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-96 animate-pulse rounded-3xl bg-sand" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="mt-20 text-center" data-testid="catalog-empty">
          <p className="font-serif text-2xl text-stone2">Aucun produit trouvé.</p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="catalog-grid">
          {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      )}
    </div>
  );
}
