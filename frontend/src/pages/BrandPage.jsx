import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Tag } from "lucide-react";
import api, { mediaUrl } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { useCategories } from "@/context/CategoriesContext";

export default function BrandPage() {
  const { id } = useParams();
  const { categories } = useCategories();
  const [brand, setBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [onPromo, setOnPromo] = useState(false);
  const [catId, setCatId] = useState("");

  useEffect(() => { window.scrollTo(0, 0); api.get(`/brands/${id}`).then((r) => setBrand(r.data)); }, [id]);

  useEffect(() => {
    if (!brand) return;
    const qs = new URLSearchParams();
    qs.set("brand", brand.name);
    if (onPromo) qs.set("on_promo", "true");
    if (catId) qs.set("category_id", catId);
    api.get(`/products?${qs.toString()}`).then((rr) => setProducts(rr.data));
  }, [brand, onPromo, catId]);

  if (!brand) return <div className="py-24 text-center text-slate-400">Chargement…</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="rounded-3xl bg-gradient-to-br from-mint-50 to-mint-100/50 p-8 sm:p-12 mb-8 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-32 h-24 rounded-2xl bg-white grid place-items-center p-4 shadow-sm shrink-0">
          {brand.logo ? <img src={mediaUrl(brand.logo)} alt={brand.name} className="max-h-full max-w-full object-contain" /> :
            <span className="font-display font-bold text-slate-700 text-center">{brand.name}</span>}
        </div>
        <div className="text-center sm:text-left">
          <h1 className="font-display font-extrabold text-3xl text-slate-dark">{brand.name}</h1>
          <p className="text-slate-600 mt-2 max-w-xl">{brand.description}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6" data-testid="brand-filters">
        <button onClick={() => setOnPromo(!onPromo)} data-testid="brand-filter-promo"
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${onPromo ? "bg-red-500 text-white border-red-500" : "bg-white border-mint-200 text-slate-700 hover:border-red-300"}`}>
          <Tag className="w-4 h-4" /> En promo
        </button>
        <select value={catId} onChange={(e) => setCatId(e.target.value)} data-testid="brand-filter-category"
          className="px-4 py-2 rounded-full border border-mint-200 text-sm bg-white outline-none focus:ring-2 focus:ring-mint-500">
          <option value="">Toutes les catégories</option>
          {categories.map((c) => [
            <option key={c.id} value={c.id}>{c.label}</option>,
            ...(c.children || []).map((s) => <option key={s.id} value={s.id}>&nbsp;&nbsp;— {s.label}</option>),
          ])}
        </select>
        {(onPromo || catId) && <button onClick={() => { setOnPromo(false); setCatId(""); }} className="text-sm text-slate-500 hover:text-mint-700 underline">Réinitialiser</button>}
      </div>

      {products.length === 0 ? <p className="text-center text-slate-400 py-12" data-testid="brand-empty">Aucun produit ne correspond à ces filtres.</p> :
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>}
    </div>
  );
}
