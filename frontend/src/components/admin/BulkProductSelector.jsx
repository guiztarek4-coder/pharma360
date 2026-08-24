import { useEffect, useState } from "react";
import { X, ChevronRight, Search } from "lucide-react";
import api, { formatDA, mediaUrl } from "@/lib/api";
import { useCategories } from "@/context/CategoriesContext";

const inp = "w-full px-3 py-2 rounded-xl border border-mint-200 text-sm outline-none focus:ring-2 focus:ring-mint-500";

// Flatten the category tree into a visible list based on the expanded map (no recursion in JSX).
function flattenVisible(nodes, expanded, depth, acc) {
  (nodes || []).forEach((n) => {
    const kids = n.children || [];
    acc.push({ id: n.id, name: n.name, depth, hasKids: kids.length > 0 });
    if (kids.length > 0 && expanded[n.id]) flattenVisible(kids, expanded, depth + 1, acc);
  });
  return acc;
}

export default function BulkProductSelector({ value, onChange, testid = "bulk" }) {
  const { categories } = useCategories();
  const ids = value || [];
  const [activeCat, setActiveCat] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [expanded, setExpanded] = useState({});
  const [selectedProducts, setSelectedProducts] = useState([]);

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q.trim()), 300); return () => clearTimeout(t); }, [q]);

  useEffect(() => {
    if (ids.length === 0) { setSelectedProducts([]); return; }
    Promise.all(ids.map((id) => api.get(`/products/${id}`).then((r) => r.data).catch(() => null))).then((a) => setSelectedProducts(a.filter(Boolean)));
  }, [JSON.stringify(ids)]);

  useEffect(() => {
    const searching = debouncedQ.length >= 2;
    if (!searching && !activeCat) { setProducts([]); return; }
    setLoading(true);
    let url = "/products?limit=500";
    if (searching) url += `&search=${encodeURIComponent(debouncedQ)}`;
    else if (activeCat) url += `&category_id=${activeCat}`;
    api.get(url).then((r) => setProducts(r.data)).catch(() => setProducts([])).finally(() => setLoading(false));
  }, [activeCat, debouncedQ]);

  const toggle = (id) => onChange(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  const remove = (id) => onChange(ids.filter((x) => x !== id));
  const shownIds = products.map((p) => p.id);
  const allShownSelected = shownIds.length > 0 && shownIds.every((id) => ids.includes(id));
  const toggleAll = () => {
    if (allShownSelected) onChange(ids.filter((id) => !shownIds.includes(id)));
    else onChange([...new Set([...ids, ...shownIds])]);
  };
  const toggleExpand = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const catRows = flattenVisible(categories, expanded, 0, []);

  return (
    <div className="border border-mint-100 rounded-xl overflow-hidden" data-testid={`${testid}-selector`}>
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-mint-50/40 border-b border-mint-100" data-testid={`${testid}-chips`}>
          <span className="text-xs font-semibold text-mint-700 self-center mr-1">{selectedProducts.length} sélectionné{selectedProducts.length > 1 ? "s" : ""} :</span>
          {selectedProducts.map((p) => (
            <span key={p.id} data-testid={`${testid}-chip-${p.id}`} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-white border border-mint-200 text-xs">
              {p.name}
              <button type="button" onClick={() => remove(p.id)} className="w-4 h-4 rounded-full hover:bg-mint-100 grid place-items-center"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2">
        <div className="border-r border-mint-100 max-h-72 overflow-auto p-1 bg-slate-50/40" data-testid={`${testid}-cat-tree`}>
          <div className="text-[11px] font-semibold text-slate-400 uppercase px-2 py-1">Catégories</div>
          {catRows.map((c) => (
            <div key={c.id} className={`flex items-center gap-1 rounded-lg ${activeCat === c.id ? "bg-mint-100" : "hover:bg-mint-50"}`} style={{ paddingLeft: c.depth * 12 }}>
              {c.hasKids ? (
                <button type="button" onClick={() => toggleExpand(c.id)} className="w-5 h-5 grid place-items-center text-slate-400 shrink-0" data-testid={`${testid}-cat-expand-${c.id}`}>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded[c.id] ? "rotate-90" : ""}`} />
                </button>
              ) : <span className="w-5 shrink-0" />}
              <button type="button" onClick={() => setActiveCat(c.id)} data-testid={`${testid}-cat-${c.id}`} className={`flex-1 text-left py-1.5 pr-2 text-sm truncate ${activeCat === c.id ? "font-semibold text-mint-800" : "text-slate-600"}`}>
                {c.name}
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-col max-h-72">
          <div className="p-2 border-b border-mint-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un produit…" data-testid={`${testid}-search`} className={`${inp} pl-8`} />
            </div>
          </div>
          {shownIds.length > 0 && (
            <label className="flex items-center gap-2 px-3 py-2 border-b border-mint-50 bg-mint-50/30 text-sm font-semibold cursor-pointer" data-testid={`${testid}-select-all`}>
              <input type="checkbox" checked={allShownSelected} onChange={toggleAll} className="accent-mint-600 w-4 h-4" />
              Tout sélectionner ({shownIds.length}) <span className="text-[11px] font-normal text-slate-400">— cumulé entre catégories</span>
            </label>
          )}
          <div className="flex-1 overflow-auto">
            {loading && <p className="text-slate-400 text-sm p-3">Chargement…</p>}
            {!loading && products.length === 0 && <p className="text-slate-400 text-sm p-3">{debouncedQ.length >= 2 ? "Aucun produit trouvé." : "Choisissez une catégorie ou recherchez un produit."}</p>}
            {!loading && products.map((p) => (
              <label key={p.id} data-testid={`${testid}-product-${p.id}`} className="flex items-center gap-2 px-3 py-1.5 hover:bg-mint-50 cursor-pointer border-b border-slate-50">
                <input type="checkbox" checked={ids.includes(p.id)} onChange={() => toggle(p.id)} className="accent-mint-600 w-4 h-4 shrink-0" data-testid={`${testid}-check-${p.id}`} />
                <img src={mediaUrl(p.images?.[0])} alt="" className="w-8 h-8 rounded object-cover bg-mint-50 shrink-0" />
                <span className="flex-1 text-sm line-clamp-1">{p.name}</span>
                <span className="text-xs text-mint-700 font-semibold shrink-0">{formatDA(p.price)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
