import { Link, useNavigate } from "react-router-dom";
import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatDA, mediaUrl } from "@/lib/api";

export default function CartDrawer() {
  const { items, open, setOpen, updateQty, removeItem, total, count } = useCart();
  const navigate = useNavigate();
  if (!open) return null;

  const goCheckout = () => { setOpen(false); navigate("/commande"); };

  return (
    <div className="fixed inset-0 z-50" data-testid="cart-drawer">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white flex flex-col shadow-2xl animate-fade-up">
        <div className="flex items-center justify-between p-5 border-b border-mint-100">
          <h3 className="font-display font-bold text-lg flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-mint-600" /> Mon panier ({count})</h3>
          <button onClick={() => setOpen(false)} data-testid="cart-close" className="w-9 h-9 rounded-full hover:bg-mint-50 grid place-items-center"><X className="w-5 h-5" /></button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 grid place-items-center text-center p-8">
            <div>
              <ShoppingBag className="w-14 h-14 text-mint-200 mx-auto mb-3" />
              <p className="text-slate-500 mb-4">Votre panier est vide</p>
              <button onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-full bg-mint-600 text-white font-semibold text-sm hover:bg-mint-700">Continuer mes achats</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {items.map((it) => (
                <div key={it.product_id} className="flex gap-3 p-3 rounded-2xl border border-mint-100 bg-mint-50/30" data-testid={`cart-line-${it.product_id}`}>
                  <img src={mediaUrl(it.image)} alt="" className="w-16 h-16 rounded-xl object-cover bg-white shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold line-clamp-2">{it.name}</div>
                    <div className="text-mint-700 font-bold text-sm mt-1">{formatDA(it.price)}</div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 bg-white rounded-full border border-mint-200 px-1">
                        <button onClick={() => updateQty(it.product_id, it.quantity - 1)} data-testid={`cart-dec-${it.product_id}`} className="w-6 h-6 grid place-items-center text-mint-700"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="text-sm font-semibold w-5 text-center">{it.quantity}</span>
                        <button onClick={() => updateQty(it.product_id, it.quantity + 1)} data-testid={`cart-inc-${it.product_id}`} className="w-6 h-6 grid place-items-center text-mint-700"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                      <button onClick={() => removeItem(it.product_id)} data-testid={`cart-remove-${it.product_id}`} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-mint-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Sous-total</span>
                <span className="font-display font-extrabold text-lg" data-testid="cart-total">{formatDA(total)}</span>
              </div>
              <p className="text-xs text-slate-400">Frais de livraison calculés à la commande.</p>
              <button onClick={goCheckout} data-testid="cart-checkout-button" className="w-full py-3 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold shadow-lg shadow-mint-600/30 transition-colors">Passer la commande</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
