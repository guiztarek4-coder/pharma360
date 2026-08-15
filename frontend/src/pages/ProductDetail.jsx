import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShoppingCart, Plus, Minus, ShieldCheck, Truck, CreditCard, ChevronRight, Check } from "lucide-react";
import api, { formatDA, mediaUrl } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/context/CartContext";

export default function ProductDetail() {
  const { id } = useParams();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    setQty(1);
    api.get(`/products/${id}`).then((r) => {
      setProduct(r.data);
      setActiveImg(0);
      api.get(`/products?category=${r.data.category}&limit=5`).then((rr) => setRelated(rr.data.filter((p) => p.id !== id).slice(0, 4)));
    });
  }, [id]);

  if (!product) return <div className="max-w-7xl mx-auto px-6 py-20 text-center text-slate-400">Chargement…</div>;

  const promo = product.old_price && product.old_price > product.price;
  const discount = promo ? Math.round((1 - product.price / product.old_price) * 100) : 0;
  const images = product.images?.length ? product.images : [null];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-6">
        <Link to="/" className="hover:text-mint-700">Accueil</Link><ChevronRight className="w-3 h-3" />
        <Link to={`/categorie/${product.category}`} className="hover:text-mint-700 capitalize">{product.category}</Link><ChevronRight className="w-3 h-3" />
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
          </div>

          <div className="grid grid-cols-3 gap-3 mt-8">
            {[[Truck, "Livraison 58 wilayas"], [CreditCard, "Paiement livraison"], [ShieldCheck, "100% Original"]].map(([Icon, t], i) => (
              <div key={i} className="text-center p-3 rounded-2xl bg-mint-50/60 border border-mint-100">
                <Icon className="w-5 h-5 text-mint-600 mx-auto mb-1.5" />
                <div className="text-xs text-slate-600 font-medium">{t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display font-extrabold text-2xl text-slate-dark mb-6">Vous aimerez aussi</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
