import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/ProductCard";

export default function Favorites() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [products, setProducts] = useState(null);

  useEffect(() => {
    if (user === false) { navigate("/auth"); return; }
    if (!user) return;
    api.get("/favorites").then((r) => setProducts(r.data)).catch(() => setProducts([]));
  }, [user, navigate]);

  if (!user) return null;

  const addAll = () => {
    let n = 0;
    products.forEach((p) => { if (p.stock > 0) { addToCart(p, 1); n++; } });
    toast.success(n > 0 ? `${n} produit(s) ajouté(s) au panier` : "Aucun produit en stock");
    if (n > 0) navigate("/panier");
  };

  return (
    <div className="mx-auto max-w-7xl px-6 pb-24 pt-32" data-testid="favorites-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="badge-mono text-terra">J'aime</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-obsidian sm:text-4xl">Mes favoris</h1>
        </div>
        {products && products.length > 0 && (
          <button onClick={addAll} className="btn-brand" data-testid="add-all-to-cart">
            <ShoppingBag size={15} /> Tout ajouter au panier
          </button>
        )}
      </div>

      {products === null ? (
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-96 animate-pulse rounded-3xl bg-sand" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="mt-20 text-center" data-testid="favorites-empty">
          <Heart size={48} className="mx-auto text-stone2/40" />
          <p className="mt-4 font-serif text-2xl text-stone2">Aucun favori pour le moment.</p>
          <p className="mt-2 text-sm text-stone2">Touchez le cœur d'un produit pour le retrouver ici.</p>
          <Link to="/catalogue" className="btn-brand mt-8" data-testid="favorites-browse">Parcourir le catalogue</Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="favorites-grid">
          {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      )}
    </div>
  );
}
