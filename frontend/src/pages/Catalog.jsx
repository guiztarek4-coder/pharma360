import { useEffect, useState } from "react";
import { useSearchParams, useParams, Link } from "react-router-dom";
import { SlidersHorizontal, X, ChevronRight, Home as HomeIcon } from "lucide-react";
import api, { mediaUrl } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { useCategories } from "@/context/CategoriesContext";

function Breadcrumb({ ancestors }) {
  return (
    <nav className="flex items-center flex-wrap gap-1 text-sm text-slate-500 mb-4" data-testid="catalog-breadcrumb">
      <Link to="/" className="hover:text-mint-700 flex items-center gap-1"><HomeIcon className="w-3.5 h-3.5" /> Accueil</Link>
      {ancestors.map((a, i) => (
        <span key={a.id} className="flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          {i === ancestors.length - 1
            ? <span className="text-slate-dark font-semibold">{a.label}</span>
            : <Link to={`/categorie/${a.id}`} className="hover:text-mint-700">{a.label}</Link>}
        </span>
      ))}
    </nav>
  );
}

function CategoryGrid({ nodes }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5" data-testid="category-children-grid">
      {nodes.map((c) => (
        <Link key={c.id} to={`/categorie/${c.id}`} data-testid={`catalog-category-${c.id}`}
          className="group relative aspect-[4/5] sm:aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all">
          <img src={mediaUrl(c.image)} alt={c.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-slate-900/10 to-transparent" />
          <span className="absolute bottom-3 left-3 right-3 font-display font-bold text-white text-base sm:text-lg leading-tight">{c.label}</span>
        </Link>
      ))}
    </div>
  );
}

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const { categoryId } = useParams();
  const { categories, findById, getAncestors } = useCategories();
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const brand = params.get("brand") || "";
  const search = params.get("search") || "";
  const onPromo = params.get("on_promo") || "";
  const isNew = params.get("is_new") || "";
  const featured = params.get("featured") || "";
  const sort = params.get("sort") || "recent";
  const maxPrice = params.get("max_price") || "";

  const node = categoryId ? findById(categoryId) : null;
  const isDrilldown = !!categoryId;
  const children = node?.children || [];
  const hasChildren = children.length > 0;
  const ancestors = categoryId ? getAncestors(categoryId) : [];
  // In drilldown mode we only fetch products when the node is a leaf (no children)
  const showProducts = !isDrilldown || (node && !hasChildren);

  useEffect(() => { api.get("/brands").then((r) => setBrands(r.data)); }, []);

  useEffect(() => {
    if (isDrilldown && (!node || hasChildren)) { setProducts([]); setLoading(false); return; }
    setLoading(true);
    const qs = new URLSearchParams();
    if (isDrilldown && node) qs.set("category_id", node.id);
    if (brand) qs.set("brand", brand);
    if (search) qs.set("search", search);
    if (onPromo) qs.set("on_promo", "true");
    if (isNew) qs.set("is_new", "true");
    if (featured) qs.set("featured", "true");
    if (sort) qs.set("sort", sort);
    if (maxPrice) qs.set("max_price", maxPrice);
    api.get(`/products?${qs.toString()}`).then((r) => { setProducts(r.data); setLoading(false); });
  }, [categoryId, node?.id, hasChildren, brand, search, onPromo, isNew, featured, sort, maxPrice]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  };

  const title = node?.label || (search ? `Recherche : "${search}"` : onPromo ? "Promotions" : isNew ? "Nouveautés" : featured ? "Coups de cœur" : brand || "Catalogue");

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
    </div>
  );

  // Loading the tree for a drilldown route that isn't resolved yet
  if (isDrilldown && !node && categories.length === 0) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center text-slate-400">Chargement…</div>;
  }
  if (isDrilldown && !node && categories.length > 0) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center text-slate-500">Catégorie introuvable. <Link to="/catalogue" className="text-mint-700 font-semibold">Voir le catalogue</Link></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {isDrilldown && ancestors.length > 0 && <Breadcrumb ancestors={ancestors} />}

      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-dark" data-testid="catalog-title">{title}</h1>
          {showProducts
            ? <p className="text-slate-500 text-sm mt-1">{products.length} produit{products.length > 1 ? "s" : ""}</p>
            : <p className="text-slate-500 text-sm mt-1">{children.length} sous-catégorie{children.length > 1 ? "s" : ""}</p>}
        </div>
        {showProducts && (
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
        )}
      </div>

      {/* Drilldown with children: show category cards */}
      {isDrilldown && hasChildren ? (
        <CategoryGrid nodes={children} />
      ) : (
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
              <div className="text-center py-20 text-slate-500" data-testid="catalog-empty">Aucun produit trouvé.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </div>
        </div>
      )}

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
