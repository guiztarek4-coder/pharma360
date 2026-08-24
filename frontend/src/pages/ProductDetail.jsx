import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingBag, Minus, Plus, ShieldCheck, Truck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api, fmtPrice } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, favorites, toggleFavorite } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setProduct(null);
    setQty(1);
    api.get(`/products/${id}`).then((r) => setProduct(r.data)).catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-40 text-center" data-testid="product-not-found">
        <p className="font-serif text-3xl text-obsidian">Produit introuvable.</p>
        <Link to="/catalogue" className="btn-brand mt-8">Retour au catalogue</Link>
      </div>
    );
  }

  if (!product) {
    return <div className="mx-auto max-w-6xl px-6 pb-24 pt-40"><div className="h-[480px] animate-pulse rounded-3xl bg-sand" /></div>;
  }

  const isFav = favorites.includes(product.id);
  const rupture = product.stock <= 0;

  const onFav = async () => {
    if (!user) { toast.info("Connectez-vous pour ajouter aux favoris"); navigate("/auth"); return; }
    const added = await toggleFavorite(product.id);
    toast.success(added ? "Ajouté à vos favoris" : "Retiré de vos favoris");
  };

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-32" data-testid="product-page">
      <Link to="/catalogue" data-testid="back-to-catalog" className="inline-flex items-center gap-2 text-sm font-medium text-stone2 transition-colors hover:text-brand">
        <ArrowLeft size={15} /> Retour au catalogue
      </Link>

      <div className="mt-8 grid gap-12 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-[2rem] border-8 border-white bg-sand shadow-xl">
          <img src={product.image} alt={product.name} className="aspect-[4/5] w-full object-cover" data-testid="product-image" />
          {rupture && <span className="absolute left-4 top-4 rounded-full bg-obsidian px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-bone">Rupture de stock</span>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
          <p className="badge-mono text-terra">{product.category}</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-obsidian sm:text-4xl" data-testid="product-name">{product.name}</h1>
          <p className="mt-5 text-base leading-relaxed text-stone2" data-testid="product-description">{product.description}</p>

          <div className="mt-8 rounded-3xl border bg-white p-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-stone2 line-through">{fmtPrice(product.price)}</p>
                <p className="font-mono text-3xl font-semibold text-brand" data-testid="product-member-price">{fmtPrice(product.member_price)}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-terra">Prix Membre Privilège</p>
              </div>
              <div className="text-right">
                {rupture ? (
                  <p className="text-sm font-semibold text-red-600" data-testid="stock-info">Indisponible</p>
                ) : (
                  <p className="text-sm text-stone2" data-testid="stock-info">
                    <span className="font-mono font-semibold text-brand">{product.stock}</span> en stock
                  </p>
                )}
                {!user && (
                  <Link to="/auth" className="mt-1 block text-xs font-semibold text-terra underline underline-offset-2">
                    Connectez-vous pour le prix membre
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center rounded-full border">
                <button onClick={() => setQty(Math.max(1, qty - 1))} data-testid="qty-minus" aria-label="Diminuer" className="flex h-11 w-11 items-center justify-center text-obsidian hover:text-brand">
                  <Minus size={15} />
                </button>
                <span className="w-10 text-center font-mono font-semibold" data-testid="qty-value">{qty}</span>
                <button onClick={() => setQty(Math.min(product.stock, qty + 1))} data-testid="qty-plus" aria-label="Augmenter" className="flex h-11 w-11 items-center justify-center text-obsidian hover:text-brand">
                  <Plus size={15} />
                </button>
              </div>
              <button
                onClick={() => { addToCart(product, qty); toast.success(`${qty} × ${product.name} ajouté au panier`); }}
                disabled={rupture}
                data-testid="product-add-to-cart"
                className="btn-brand flex-1 disabled:opacity-40"
              >
                <ShoppingBag size={16} /> Ajouter au panier
              </button>
              <button onClick={onFav} data-testid="product-favorite-toggle" aria-label="J'aime"
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-all ${isFav ? "border-terra bg-terra text-white" : "text-obsidian hover:border-terra hover:text-terra"}`}>
                <Heart size={18} fill={isFav ? "currentColor" : "none"} />
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl bg-brand-pale p-4">
              <ShieldCheck size={18} className="shrink-0 text-brand" />
              <p className="text-xs font-medium text-brand">Produit certifié, validé par nos pharmaciens</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-brand-pale p-4">
              <Truck size={18} className="shrink-0 text-brand" />
              <p className="text-xs font-medium text-brand">Livraison express — paiement à la livraison</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
