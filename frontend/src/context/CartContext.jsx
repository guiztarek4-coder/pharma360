import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);
const KEY = "lolivier_cart";

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (product, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.product.id === product.id);
      if (found) {
        return prev.map((i) => i.product.id === product.id ? { ...i, qty: Math.min(i.qty + qty, product.stock) } : i);
      }
      return [...prev, { product, qty: Math.min(qty, product.stock) }];
    });
  };

  const setQty = (productId, qty) => {
    if (qty < 1) return;
    setItems((prev) => prev.map((i) => i.product.id === productId ? { ...i, qty: Math.min(qty, i.product.stock) } : i));
  };

  const removeFromCart = (productId) => setItems((prev) => prev.filter((i) => i.product.id !== productId));
  const clearCart = () => setItems([]);

  const priceOf = (p) => (user ? p.member_price : p.price);
  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + priceOf(i.product) * i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, setQty, removeFromCart, clearCart, count, total, priceOf }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
