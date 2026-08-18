import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const STORAGE_KEY = "pharma360_cart";

const readCart = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(readCart);
  const [open, setOpen] = useState(false);
  const [lastAddedId, setLastAddedId] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product, quantity = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.product_id === product.id);
      if (found) {
        return prev.map((i) => i.product_id === product.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        price: product.price,
        image: (product.images && product.images[0]) || null,
        quantity,
        stock: product.stock,
      }];
    });
    setLastAddedId(product.id);
    toast.success(`${product.name} ajouté au panier`);
    setOpen(true);
  };

  const updateQty = (productId, quantity) => {
    if (quantity <= 0) return removeItem(productId);
    setItems((prev) => prev.map((i) => i.product_id === productId ? { ...i, quantity } : i));
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const clear = () => setItems([]);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, count, total, addItem, updateQty, removeItem, clear, open, setOpen, lastAddedId }}>
      {children}
    </CartContext.Provider>
  );
};
