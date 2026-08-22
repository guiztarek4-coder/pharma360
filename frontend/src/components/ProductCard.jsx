import { Link } from "react-router-dom";
import { ShoppingCart, Heart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { formatDA, mediaUrl } from "@/lib/api";

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(product.id);
  const promo = product.old_price && product.old_price > product.price;
  const discount = promo ? Math.round((1 - product.price / product.old_price) * 100) : 0;
  const badge = product.badge || (product.is_new ? "NOUVEAU" : null);
  const badgeColor = badge === "NOUVEAU" ? "bg-blue-600" : badge === "COUP DE COEUR" ? "bg-pink-500" : badge === "NATUREL" ? "bg-mint-600" : "bg-red-500";

  return (
    <div className="group relative bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:border-mint-400 hover:shadow-xl transition-all duration-300 flex flex-col" data-testid={`product-card-${product.id}`}>
      <Link to={`/produit/${product.id}`} className="block relative aspect-square bg-mint-50/40 overflow-hidden">
        <img src={mediaUrl(product.images?.[0])} alt={product.name} loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {promo && <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-bold shadow">-{discount}%</span>}
          {badge && !promo && <span className={`px-2 py-0.5 rounded-full ${badgeColor} text-white text-[10px] font-bold shadow font-mono-label`}>{badge}</span>}
        </div>
        {product.stock <= 0 && <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-slate-700 text-white text-[10px] font-semibold">Rupture</span>}
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); toggleFavorite(product); }}
        data-testid={`product-card-fav-${product.id}`}
        aria-label="Ajouter aux favoris"
        className={`absolute top-2.5 right-2.5 z-10 w-9 h-9 rounded-full grid place-items-center shadow-md transition-all active:scale-90 ${fav ? "bg-red-500 text-white" : "bg-white/90 text-slate-500 hover:text-red-500"} ${product.stock <= 0 ? "top-11" : ""}`}>
        <Heart className="w-4.5 h-4.5" fill={fav ? "currentColor" : "none"} />
      </button>
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        {product.brand && <div className="text-[11px] font-mono-label text-mint-600 mb-1">{product.brand}</div>}
        <Link to={`/produit/${product.id}`} className="text-sm font-semibold text-slate-dark line-clamp-2 leading-snug hover:text-mint-700 transition-colors min-h-[2.5rem]">{product.name}</Link>
        <div className="mt-auto pt-3 flex items-end justify-between gap-2">
          <div>
            {promo && <div className="text-xs text-slate-400 line-through">{formatDA(product.old_price)}</div>}
            <div className="font-display font-extrabold text-mint-700 text-base sm:text-lg">{formatDA(product.price)}</div>
          </div>
          <button
            onClick={() => addItem(product)}
            disabled={product.stock <= 0}
            data-testid={`product-card-add-to-cart-${product.id}`}
            className="w-10 h-10 rounded-full bg-mint-600 hover:bg-mint-700 active:scale-95 text-white grid place-items-center shadow-md shadow-mint-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
            <ShoppingCart className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
