import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { mediaUrl } from "@/lib/api";

export default function Brands() {
  const [brands, setBrands] = useState([]);
  useEffect(() => { api.get("/brands").then((r) => setBrands(r.data)); }, []);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display font-extrabold text-3xl text-slate-dark mb-2">Nos Marques</h1>
      <p className="text-slate-500 mb-8">Les plus grands laboratoires parapharmaceutiques disponibles chez Pharma360.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {brands.map((b) => (
          <Link key={b.id} to={`/marque/${b.id}`} data-testid={`brand-${b.id}`}
            className="aspect-[3/2] rounded-2xl bg-white border border-slate-200/80 hover:border-mint-400 hover:shadow-md grid place-items-center p-5 transition-all">
            {b.logo ? <img src={mediaUrl(b.logo)} alt={b.name} className="max-h-full max-w-full object-contain" /> :
              <span className="font-display font-bold text-slate-700 text-center">{b.name}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
