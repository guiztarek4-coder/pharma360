import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { mediaUrl } from "@/lib/api";
import ProductCard from "@/components/ProductCard";

export default function BrandPage() {
  const { id } = useParams();
  const [brand, setBrand] = useState(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get(`/brands/${id}`).then((r) => {
      setBrand(r.data);
      api.get(`/products?brand=${encodeURIComponent(r.data.name)}`).then((rr) => setProducts(rr.data));
    });
  }, [id]);

  if (!brand) return <div className="py-24 text-center text-slate-400">Chargement…</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="rounded-3xl bg-gradient-to-br from-mint-50 to-mint-100/50 p-8 sm:p-12 mb-10 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-32 h-24 rounded-2xl bg-white grid place-items-center p-4 shadow-sm shrink-0">
          {brand.logo ? <img src={mediaUrl(brand.logo)} alt={brand.name} className="max-h-full max-w-full object-contain" /> :
            <span className="font-display font-bold text-slate-700 text-center">{brand.name}</span>}
        </div>
        <div className="text-center sm:text-left">
          <h1 className="font-display font-extrabold text-3xl text-slate-dark">{brand.name}</h1>
          <p className="text-slate-600 mt-2 max-w-xl">{brand.description}</p>
        </div>
      </div>
      {products.length === 0 ? <p className="text-center text-slate-400 py-12">Aucun produit disponible pour cette marque.</p> :
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>}
    </div>
  );
}
