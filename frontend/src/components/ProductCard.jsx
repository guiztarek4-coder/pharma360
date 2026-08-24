import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { fmtPrice } from "@/lib/api";

export default function ProductCard({ product, index = 0 }) {
  const { user, favorites, toggleFavorite } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const isFav = favorites.includes(product.id);
  const rupture = product.stock <= 0;

  const onFav = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.info("Connectez-vous pour ajouter aux favoris");
      navigate("/auth");
      return;
    }
    const added = await toggleFavorite(product.id);
    toast.success(added ? "Ajouté à vos favoris" : "Retiré de vos favoris");
  };

  const onAdd = (e) => {
    e.preventDefault();
    addToCart(product, 1);
    toast.success(`${product.name} ajouté au panier`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
      data-testid={`product-card-${product.id}`}
    >
      <Link to={`/produit/${product.id}`} className="card-lift group block overflow-hidden rounded-3xl border bg-white">
        <div className="relative aspect-[4/5] overflow-hidden bg-sand">
          <img src={product.image} alt={product.name} loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <button onClick={onFav} data-testid={`favorite-toggle-${product.id}`} aria-label="J'aime"
            className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all ${isFav ? "bg-terra text-white" : "bg-white/80 text-obsidian hover:text-terra"}`}>
            <Heart size={16} fill={isFav ? "currentColor" : "none"} />
          </button>
          {rupture ? (
            <span className="absolute left-3 top-3 rounded-full bg-obsidian px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-bone" data-testid={`rupture-badge-${product.id}`}>Rupture</span>
          ) : product.stock < 10 ? (
            <span className="absolute left-3 top-3 rounded-full bg-terra px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Stock limité</span>
          ) : null}
        </div>
        <div className="p-5">
          <p className="badge-mono text-stone2">{product.category}</p>
          <h3 className="mt-1.5 font-serif text-lg font-semibold leading-snug text-obsidian">{product.name}</h3>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-xs text-stone2 line-through">{fmtPrice(product.price)}</p>
              <p className="font-mono text-base font-semibold text-brand" data-testid={`member-price-${product.id}`}>
                {fmtPrice(product.member_price)}
                <span className="ml-1.5 rounded-full bg-brand-pale px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand">Membre</span>
              </p>
            </div>
            <button onClick={onAdd} disabled={rupture} data-testid={`add-to-cart-${product.id}`} aria-label="Ajouter au panier"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-bone transition-all hover:bg-brand-hover disabled:opacity-30">
              <ShoppingBag size={16} />
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
