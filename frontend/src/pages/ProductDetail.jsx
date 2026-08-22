import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShoppingCart, Plus, Minus, ShieldCheck, Truck, CreditCard, ChevronRight, Check, Star, Heart } from "lucide-react";
import api, { formatDA, formatApiError, mediaUrl } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useCategories } from "@/context/CategoriesContext";
import { toast } from "sonner";

function Stars({ value, size = "w-4 h-4", onSelect }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onSelect} onClick={() => onSelect && onSelect(n)}
          className={onSelect ? "cursor-pointer" : "cursor-default"}>
          <Star className={`${size} ${n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
        </button>
      ))}
    </div>
  );
}

function Reviews({ productId }) {
  const [data, setData] = useState({ reviews: [], average: 0, count: 0 });
  const [form, setForm] = useState({ name: "", rating: 5, comment: "" });
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/products/${productId}/reviews`).then((r) => setData(r.data));
  useEffect(() => { load(); }, [productId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Votre nom est requis"); return; }
    setBusy(true);
    try {
      await api.post(`/products/${productId}/reviews`, form);
      toast.success("Merci pour votre avis !");
      setForm({ name: "", rating: 5, comment: "" });
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  return (
    <section className="mt-16" data-testid="reviews-section">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-display font-extrabold text-2xl text-slate-dark">Avis clients</h2>
        {data.count > 0 && (
          <div className="flex items-center gap-2"><Stars value={data.average} /><span className="text-sm text-slate-500">{data.average}/5 · {data.count} avis</span></div>
        )}
      </div>
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          {data.reviews.length === 0 ? <p className="text-slate-400 text-sm">Aucun avis pour le moment. Soyez le premier !</p> :
            data.reviews.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200/80 p-4" data-testid={`review-${r.id}`}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">{r.name}</div>
                  <Stars value={r.rating} size="w-3.5 h-3.5" />
                </div>
                {r.comment && <p className="text-sm text-slate-600 mt-2">{r.comment}</p>}
                <div className="text-xs text-slate-400 mt-2">{new Date(r.created_at).toLocaleDateString("fr-FR")}</div>
              </div>
            ))}
        </div>
        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200/80 p-5 h-fit space-y-3">
          <h3 className="font-display font-bold">Laisser un avis</h3>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Votre nom" data-testid="review-name"
            className="w-full px-4 py-2.5 rounded-xl border border-mint-200 outline-none focus:ring-2 focus:ring-mint-500" />
          <div className="flex items-center gap-2"><span className="text-sm text-slate-500">Note :</span><Stars value={form.rating} onSelect={(n) => setForm({ ...form, rating: n })} /></div>
          <textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} rows={3} placeholder="Votre commentaire (optionnel)" data-testid="review-comment"
            className="w-full px-4 py-2.5 rounded-xl border border-mint-200 outline-none focus:ring-2 focus:ring-mint-500" />
          <button disabled={busy} data-testid="review-submit" className="px-6 py-2.5 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold text-sm disabled:opacity-50">{busy ? "…" : "Publier mon avis"}</button>
        </form>
      </div>
    </section>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { getAncestors, flat } = useCategories();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    setQty(1);
    setRelated([]);
    api.get(`/products/${id}`).then((r) => { setProduct(r.data); setActiveImg(0); });
  }, [id]);

  // Fetch related products once BOTH the product and the category tree are ready
  useEffect(() => {
    if (!product) return;
    const path = product.category_id ? getAncestors(product.category_id) : [];
    // Prefer the sub-category (parent of the leaf) to surface siblings across the section
    const scope = path.length >= 2 ? path[path.length - 2].id : product.category_id;
    const url = scope ? `/products?category_id=${scope}&limit=12` : `/products?category=${product.category}&limit=12`;
    api.get(url).then((rr) => setRelated(rr.data.filter((p) => p.id !== product.id).slice(0, 4)));
  }, [product, flat]);

  if (!product) return <div className="max-w-7xl mx-auto px-6 py-20 text-center text-slate-400">Chargement…</div>;

  const promo = product.old_price && product.old_price > product.price;
  const discount = promo ? Math.round((1 - product.price / product.old_price) * 100) : 0;
  const images = product.images?.length ? product.images : [null];
  const catPath = product.category_id ? getAncestors(product.category_id) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-6 flex-wrap" data-testid="product-breadcrumb">
        <Link to="/" className="hover:text-mint-700">Accueil</Link><ChevronRight className="w-3 h-3" />
        {catPath.length > 0 ? catPath.map((c) => (
          <span key={c.id} className="flex items-center gap-1.5">
            <Link to={`/categorie/${c.id}`} className="hover:text-mint-700">{c.label}</Link><ChevronRight className="w-3 h-3" />
          </span>
        )) : (
          <><span className="capitalize">{product.category}</span><ChevronRight className="w-3 h-3" /></>
        )}
        <span className="text-slate-600 truncate">{product.name}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        <div>
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-mint-50/40 border border-slate-200/80">
            <img src={mediaUrl(images[activeImg])} alt={product.name} className="w-full h-full object-cover" data-testid="product-main-image" />
            {promo && <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-red-500 text-white font-bold text-sm">-{discount}%</span>}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`w-16 h-16 rounded-xl overflow-hidden border-2 ${activeImg === i ? "border-mint-500" : "border-transparent"}`}>
                  <img src={mediaUrl(img)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.brand && <Link to={`/catalogue?brand=${encodeURIComponent(product.brand)}`} className="text-sm font-mono-label text-mint-600">{product.brand}</Link>}
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl md:text-4xl text-slate-dark mt-1 leading-tight" data-testid="product-title">{product.name}</h1>

          <div className="flex items-center gap-3 mt-5">
            <span className="font-display font-extrabold text-3xl text-mint-700" data-testid="product-price">{formatDA(product.price)}</span>
            {promo && <span className="text-lg text-slate-400 line-through">{formatDA(product.old_price)}</span>}
          </div>

          <div className="mt-3">
            {product.stock > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-mint-700 font-medium"><Check className="w-4 h-4" /> En stock ({product.stock} disponibles)</span>
            ) : (
              <span className="text-sm text-red-500 font-medium">Rupture de stock</span>
            )}
          </div>

          <p className="text-slate-600 leading-relaxed mt-5">{product.description}</p>

          <div className="flex items-center gap-3 mt-7">
            <div className="flex items-center gap-3 bg-white rounded-full border border-mint-200 px-2 py-1.5">
              <button onClick={() => setQty(Math.max(1, qty - 1))} data-testid="product-qty-dec" className="w-8 h-8 grid place-items-center rounded-full hover:bg-mint-50"><Minus className="w-4 h-4" /></button>
              <span className="w-8 text-center font-semibold" data-testid="product-qty">{qty}</span>
              <button onClick={() => setQty(qty + 1)} data-testid="product-qty-inc" className="w-8 h-8 grid place-items-center rounded-full hover:bg-mint-50"><Plus className="w-4 h-4" /></button>
            </div>
            <button onClick={() => addItem(product, qty)} disabled={product.stock <= 0} data-testid="product-add-to-cart"
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold shadow-lg shadow-mint-600/30 transition-colors disabled:opacity-40">
              <ShoppingCart className="w-5 h-5" /> Ajouter au panier
            </button>
            <button onClick={() => toggleFavorite(product)} data-testid="product-fav-btn" aria-label="Favoris"
              className={`w-14 shrink-0 grid place-items-center rounded-full border transition-colors ${isFavorite(product.id) ? "bg-red-500 border-red-500 text-white" : "border-mint-200 text-slate-500 hover:text-red-500 hover:border-red-300"}`}>
              <Heart className="w-5 h-5" fill={isFavorite(product.id) ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-8">
            {[[Truck, "Livraison Algérie"], [CreditCard, "Paiement livraison"], [ShieldCheck, "100% Original"]].map(([Icon, t], i) => (
              <div key={i} className="text-center p-3 rounded-2xl bg-mint-50/60 border border-mint-100">
                <Icon className="w-5 h-5 text-mint-600 mx-auto mb-1.5" />
                <div className="text-xs text-slate-600 font-medium">{t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Reviews productId={id} />

      {related.length > 0 && (
        <section className="mt-16" data-testid="related-products">
          <h2 className="font-display font-extrabold text-2xl text-slate-dark mb-6">Produits similaires</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
