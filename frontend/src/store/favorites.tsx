import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "@/src/utils/storage";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";

const KEY = "pharma_favorites";

type Ctx = {
  ids: string[];
  isFav: (id: string) => boolean;
  toggle: (id: string) => Promise<boolean>; // returns whether now favorite
  requiresAuth: boolean;
};

const FavCtx = createContext<Ctx>({} as Ctx);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<string[]>([]);

  // Load: server favorites when logged in, else local
  useEffect(() => {
    (async () => {
      if (user) {
        setIds(Array.isArray((user as any).favorites) ? (user as any).favorites : []);
      } else {
        const saved = await storage.getItem<string[]>(KEY, []);
        setIds(Array.isArray(saved) ? saved : []);
      }
    })();
  }, [user]);

  const toggle = useCallback(
    async (id: string) => {
      const currentlyFav = ids.includes(id);
      if (user) {
        try {
          const res = currentlyFav ? await api.del(`/favorites/${id}`) : await api.post(`/favorites/${id}`, {}, true);
          const next = res?.favorites || (currentlyFav ? ids.filter((x) => x !== id) : [...ids, id]);
          setIds(next);
          return next.includes(id);
        } catch {
          return currentlyFav;
        }
      } else {
        const next = currentlyFav ? ids.filter((x) => x !== id) : [...ids, id];
        setIds(next);
        storage.setItem(KEY, next);
        return !currentlyFav;
      }
    },
    [ids, user]
  );

  const isFav = useCallback((id: string) => ids.includes(id), [ids]);

  return <FavCtx.Provider value={{ ids, isFav, toggle, requiresAuth: false }}>{children}</FavCtx.Provider>;
}

export function useFavorites() {
  return useContext(FavCtx);
}
