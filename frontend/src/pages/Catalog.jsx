import { useEffect, useState } from "react";
import { useSearchParams, useParams, Link } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import api from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { useCategories } from "@/context/CategoriesContext";

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const { categoryId } = useParams();
  const { categories } = useCategories();
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const category = categoryId || params.get("category") || "";
  const subcategory = params.get("subcategory") || "";
  const brand = params.get("brand") || "";
  const search = params.get("search") || "";
  const onPromo = params.get("on_promo") || "";
  const isNew = params.get("is_new") || "";
  const featured = params.get("featured") || "";
  const sort = params.get("sort") || "recent";
  const maxPrice = params.get("max_price") || "";

  const currentCat = categories.find((c) => c.id === category);
  const subs = currentCat?.subcategories || [];

  useEffect(() => { api.get("/brands").then((r) => setBrands(r.data)); }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (category) qs.set("category", category);
    if (subcategory) qs.set("subcategory", subcategory);
    if (brand) qs.set("brand", brand);
    if (search) qs.set("search", search);
    if (onPromo) qs.set("on_promo", "true");
    if (isNew) qs.set("is_new", "true");
    if (featured) qs.set("featured", "true");
    if (sort) qs.set("sort", sort);
    if (maxPrice) qs.set("max_price", maxPrice);
    api.get(`/products?${qs.toString()}`).then((r) => { setProducts(r.data); setLoading(false); });
  }, [category, subcategory, brand, search, onPromo, isNew, featured, sort, maxPrice]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (categoryId && key === "category") return;
    setParams(next);
  };

  const catLabel = currentCat?.label;
  const title = catLabel || (search ? `Recherche : "${search}"` : onPromo ? "Promotions" : isNew ? "Nouveautés" : featured ? "Coups de cœur" : brand || "Catalogue");

  const clearAll = () => setParams(categoryId ? {} : {});

  const Filters = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-display font-bold text-sm mb-3">Marques</h4>
        <div className="space-y-1.5 max-h-52 overflow-auto pr-1">
          <button onClick={() => update("brand", "")} className={`block text-sm ${!brand ? "text-mint-700 font-semibold" : "text-slate-600"} hover:text-mint-700`}>Toutes</button>
          {brands.map((b) => (
            <button key={b.id} onClick={() => update("brand", b.name)} data-testid={`filter-brand-${b.id}`}
              className={`block text-sm ${brand === b.name ? "text-mint-700 font-semibold" : "text-slate-600"} hover:text-mint-700`}>{b.name}</button>
          ))}
        </div>
      </div>
      <div>
        <h4 className="font-display font-bold text-sm mb-3">Prix max</h4>
        <input type="range" min="500" max="10000" step="500" value={maxPrice || 10000}
          onChange={(e) => update("max_price", e.target.value === "10000" ? "" : e.target.value)}
          className="w-full accent-mint-600" data-testid="filter-price" />
        <div className="text-sm text-slate-500 mt-1">{maxPrice ? `Jusqu'à ${maxPrice} DA` : "Tous les prix"}</div>
      </div>
      {subs.length > 0 && (
        <div>
          <h4 className="font-display font-bold text-sm mb-3">Sous-catégories</h4>
          <div className="space-y-1.5">
            <button onClick={() => update("subcategory", "")} className={`block text-sm ${!subcategory ? "text-mint-700 font-semibold" : "text-slate-600"}`}>Toutes</button>
            {subs.map((s) => (
              <button key={s.id} onClick={() => update("subcategory", s.slug)} data-testid={`filter-sub-${s.id}`}
                className={`block text-sm ${subcategory === s.slug ? "text-mint-700 font-semibold" : "text-slate-600"} hover:text-mint-700`}>{s.label}</button>
            ))}
          </div>
        </div>
      )}
      {!categoryId && (
        <div>
          <h4 className="font-display font-bold text-sm mb-3">Catégories</h4>
          <div className="space-y-1.5">
            <button onClick={() => update("category", "")} className={`block text-sm ${!category ? "text-mint-700 font-semibold" : "text-slate-600"}`}>Toutes</button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => update("category", c.id)} className={`block text-sm ${category === c.id ? "text-mint-700 font-semibold" : "text-slate-600"} hover:text-mint-700`}>{c.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-dark" data-testid="catalog-title">{title}</h1>
          <p className="text-slate-500 text-sm mt-1">{products.length} produit{products.length > 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={sort} onChange={(e) => update("sort", e.target.value)} data-testid="catalog-sort"
            className="px-4 py-2.5 rounded-full border border-mint-200 text-sm bg-white outline-none focus:ring-2 focus:ring-mint-500">
            <option value="recent">Plus récents</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
            <option value="name">Nom (A-Z)</option>
          </select>
          <button onClick={() => setShowFilters(true)} className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-full border border-mint-200 text-sm font-medium" data-testid="catalog-open-filters">
            <SlidersHorizontal className="w-4 h-4" /> Filtres
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-32 bg-white rounded-2xl border border-slate-200/80 p-5">
            <Filters />
          </div>
        </aside>

        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-mint-50 animate-pulse" />)}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-slate-500">Aucun produit trouvé. <button onClick={clearAll} className="text-mint-700 font-semibold">Réinitialiser</button></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg">Filtres</h3>
              <button onClick={() => setShowFilters(false)}><X className="w-6 h-6" /></button>
            </div>
            <Filters />
            <button onClick={() => setShowFilters(false)} className="w-full mt-6 py-3 rounded-full bg-mint-600 text-white font-semibold">Voir {products.length} produits</button>
          </div>
        </div>
      )}
    </div>
  );
}
