import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const FavoritesContext = createContext(null);

export const useFavorites = () => useContext(FavoritesContext);

export const FavoritesProvider = ({ children }) => {
  const { user } = useAuth();
  const [ids, setIds] = useState([]);

  useEffect(() => {
    if (user && user.favorites) setIds(user.favorites);
    else if (!user) setIds([]);
  }, [user]);

  const isFavorite = (productId) => ids.includes(productId);

  const toggleFavorite = async (product) => {
    if (!user) {
      toast.error("Connectez-vous pour ajouter des favoris");
      return;
    }
    const pid = product.id || product;
    const already = ids.includes(pid);
    try {
      if (already) {
        const { data } = await api.delete(`/favorites/${pid}`);
        setIds(data.favorites || []);
        toast.success("Retiré des favoris");
      } else {
        const { data } = await api.post(`/favorites/${pid}`);
        setIds(data.favorites || []);
        toast.success("Ajouté à vos favoris");
      }
    } catch {
      toast.error("Une erreur est survenue");
    }
  };

  return (
    <FavoritesContext.Provider value={{ ids, isFavorite, toggleFavorite, count: ids.length }}>
      {children}
    </FavoritesContext.Provider>
  );
};
