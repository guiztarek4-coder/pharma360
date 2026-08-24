import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setToken, getToken } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = guest
  const [favorites, setFavorites] = useState([]);

  const loadFavorites = useCallback(async () => {
    try {
      const { data } = await api.get("/favorites");
      setFavorites(data.map((p) => p.id));
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (!getToken()) { setUser(false); return; }
      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
        const favs = await api.get("/favorites");
        setFavorites(favs.data.map((p) => p.id));
      } catch {
        setToken(null);
        setUser(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setUser(data);
    await loadFavorites();
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    setToken(data.token);
    setUser(data);
    setFavorites([]);
    return data;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    setToken(null);
    setUser(false);
    setFavorites([]);
  };

  const toggleFavorite = async (productId) => {
    if (!user) return false;
    if (favorites.includes(productId)) {
      await api.delete(`/favorites/${productId}`);
      setFavorites((f) => f.filter((id) => id !== productId));
      return false;
    }
    await api.post("/favorites", { product_id: productId });
    setFavorites((f) => [...f, productId]);
    return true;
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, favorites, toggleFavorite, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
