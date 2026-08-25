import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "@/src/lib/api";

// Fetches on every screen focus so admin changes on the site reflect
// immediately in the app (no stale in-memory cache).
export function useFetch<T = any>(path: string | null, query?: Record<string, any>, auth = false) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const key = path + JSON.stringify(query || {});

  const load = useCallback(async () => {
    if (!path) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await api.get(path, query, auth);
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Refetch whenever the screen gains focus (tab switch / navigation back).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (active) await load();
      })();
      return () => {
        active = false;
      };
    }, [load])
  );

  return { data, loading, error, reload: load };
}
