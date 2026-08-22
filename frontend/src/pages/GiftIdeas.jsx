import { useEffect, useState } from "react";
import { Gift, ShoppingCart } from "lucide-react";
import api, { formatDA, mediaUrl } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/context/CartContext";

export default function GiftIdeas() {
  const { addItem } = useCart();
  const [data, setData] = useState(null);

  useEffect(() => { api.get("/gift-ideas").then((r) => setData(r.data)).catch(() => setData({ intro: "", featured: [], packs: [] })); }, []);

  const addPack = (p) => addItem({ id: p.id, name: p.name, price: p.price, images: p.image ? [p.image] : [], stock: 999 });

  if (!data) return <div className="max-w-6xl mx-auto px-4 py-20 text-center text-slate-400">Chargement…</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10" data-testid="gift-ideas-page">
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mint-50 text-mint-700 text-xs font-mono-label mb-3"><Gift className="w-4 h-4" /> Idées cadeaux</span>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl">Idées cadeaux & coffrets</h1>
        {data.intro && <p className="text-slate-500 mt-3 max-w-2xl mx-auto" data-testid="gift-intro">{data.intro}</p>}
      </div>

      {data.packs.length > 0 && (
        <div className="mb-12">
          <h2 className="font-display font-bold text-xl mb-4">Nos coffrets cadeaux</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="gift-packs">
            {data.packs.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden flex flex-col hover:shadow-xl transition-shadow" data-testid={`gift-pack-${p.id}`}>
                <div className="aspect-video bg-mint-50/40 overflow-hidden">
                  {p.image ? <img src={mediaUrl(p.image)} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center"><Gift className="w-10 h-10 text-mint-300" /></div>}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-display font-bold text-lg">{p.name}</h3>
                  {p.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{p.description}</p>}
                  {p.products?.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {p.products.map((pr) => <li key={pr.id} className="text-xs text-slate-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-mint-400" /> {pr.name}</li>)}
                    </ul>
                  )}
                  <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                    <div className="font-display font-extrabold text-mint-700 text-xl">{formatDA(p.price)}</div>
                    <button onClick={() => addPack(p)} data-testid={`gift-pack-add-${p.id}`} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold text-sm">
                      <ShoppingCart className="w-4 h-4" /> Ajouter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.featured.length > 0 && (
        <div>
          <h2 className="font-display font-bold text-xl mb-4">Nos idées cadeaux</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="gift-featured">
            {data.featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      {data.packs.length === 0 && data.featured.length === 0 && (
        <p className="text-center text-slate-400 py-16" data-testid="gift-empty">Nos idées cadeaux arrivent bientôt. Revenez vite !</p>
      )}
    </div>
  );
}
