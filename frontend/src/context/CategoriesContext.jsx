import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

const CategoriesContext = createContext(null);
export const useCategories = () => useContext(CategoriesContext);

export const CategoriesProvider = ({ children }) => {
  const [categories, setCategories] = useState([]); // nested tree (top-level nodes)

  const refresh = async () => {
    try {
      const { data } = await api.get("/categories");
      setCategories(data);
    } catch {}
  };

  useEffect(() => { refresh(); }, []);

  const flat = useMemo(() => {
    const acc = [];
    const walk = (nodes) => (nodes || []).forEach((n) => { acc.push(n); walk(n.children); });
    walk(categories);
    return acc;
  }, [categories]);

  const findById = (id) => flat.find((c) => c.id === id) || null;

  const getAncestors = (id) => {
    const path = [];
    let cur = findById(id);
    let guard = 0;
    while (cur && guard < 10) {
      path.unshift(cur);
      cur = cur.parent_id ? findById(cur.parent_id) : null;
      guard += 1;
    }
    return path;
  };

  return (
    <CategoriesContext.Provider value={{ categories, flat, refresh, findById, getAncestors }}>
      {children}
    </CategoriesContext.Provider>
  );
};
