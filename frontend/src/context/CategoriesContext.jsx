import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

const CategoriesContext = createContext(null);
export const useCategories = () => useContext(CategoriesContext);

export const CategoriesProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);

  const refresh = async () => {
    try {
      const { data } = await api.get("/categories");
      setCategories(data);
    } catch {}
  };

  useEffect(() => { refresh(); }, []);

  return (
    <CategoriesContext.Provider value={{ categories, refresh }}>
      {children}
    </CategoriesContext.Provider>
  );
};
