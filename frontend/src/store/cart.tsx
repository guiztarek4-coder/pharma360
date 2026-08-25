import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { storage } from "@/src/utils/storage";

export type CartLine = {
  product_id: string;
  name: string;
  price: number;
  image?: string | null;
  brand?: string;
  stock?: number;
  quantity: number;
};

const KEY = "pharma_cart";

type Ctx = {
  items: CartLine[];
  count: number;
  subtotal: number;
  add: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  setQty: (product_id: string, qty: number) => void;
  remove: (product_id: string) => void;
  clear: () => void;
};

const CartCtx = createContext<Ctx>({} as Ctx);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<CartLine[]>(KEY, []);
      if (Array.isArray(saved)) setItems(saved);
    })();
  }, []);

  const persist = useCallback((next: CartLine[]) => {
    setItems(next);
    storage.setItem(KEY, next);
  }, []);

  const add = useCallback(
    (line: Omit<CartLine, "quantity">, qty = 1) => {
      setItems((prev) => {
        const idx = prev.findIndex((l) => l.product_id === line.product_id);
        let next: CartLine[];
        if (idx >= 0) {
          next = prev.map((l, i) => (i === idx ? { ...l, quantity: l.quantity + qty } : l));
        } else {
          next = [...prev, { ...line, quantity: qty }];
        }
        storage.setItem(KEY, next);
        return next;
      });
    },
    []
  );

  const setQty = useCallback((product_id: string, qty: number) => {
    setItems((prev) => {
      const next = qty <= 0 ? prev.filter((l) => l.product_id !== product_id) : prev.map((l) => (l.product_id === product_id ? { ...l, quantity: qty } : l));
      storage.setItem(KEY, next);
      return next;
    });
  }, []);

  const remove = useCallback((product_id: string) => {
    setItems((prev) => {
      const next = prev.filter((l) => l.product_id !== product_id);
      storage.setItem(KEY, next);
      return next;
    });
  }, []);

  const clear = useCallback(() => persist([]), [persist]);

  const count = useMemo(() => items.reduce((s, l) => s + l.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((s, l) => s + l.price * l.quantity, 0), [items]);

  return (
    <CartCtx.Provider value={{ items, count, subtotal, add, setQty, remove, clear }}>{children}</CartCtx.Provider>
  );
}

export function useCart() {
  return useContext(CartCtx);
}
