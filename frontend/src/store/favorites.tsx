import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "@/src/utils/storage";

const KEY = "pharma_favorites";

type Ctx = {
  ids: string[];
  isFav: (id: string) => boolean;
  toggle: (id: string) => void;
};

const FavCtx = createContext<Ctx>({} as Ctx);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<string[]>(KEY, []);
      if (Array.isArray(saved)) setIds(saved);
    })();
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      storage.setItem(KEY, next);
      return next;
    });
  }, []);

  const isFav = useCallback((id: string) => ids.includes(id), [ids]);

  return <FavCtx.Provider value={{ ids, isFav, toggle }}>{children}</FavCtx.Provider>;
}

export function useFavorites() {
  return useContext(FavCtx);
}
