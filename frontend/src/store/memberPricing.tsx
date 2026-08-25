import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";

type Discount = { type: "percent" | "fixed"; value: number };
type MemberPrice = { price: number; original: number; tier: string | null; type: string; value: number } | null;

type Ctx = {
  tier: string | null;
  getMemberPrice: (product: { id: string; price: number }) => MemberPrice;
};

const MPCtx = createContext<Ctx>({ tier: null, getMemberPrice: () => null });

export function MemberPricingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<{ tier: string | null; discounts: Record<string, Discount> }>({ tier: null, discounts: {} });

  useEffect(() => {
    if (!user) {
      setState({ tier: null, discounts: {} });
      return;
    }
    api
      .get("/loyalty/member-pricing", undefined, true)
      .then((d) => setState({ tier: d?.tier ?? null, discounts: d?.discounts || {} }))
      .catch(() => setState({ tier: null, discounts: {} }));
  }, [user]);

  // mirrors the website's getMemberPrice
  const getMemberPrice = useCallback(
    (product: { id: string; price: number }): MemberPrice => {
      if (!product) return null;
      const n = state.discounts?.[product.id];
      if (!n) return null;
      const a = Number(product.price) || 0;
      const r = n.type === "percent" ? a - (a * Number(n.value)) / 100 : a - Number(n.value);
      const l = Math.max(0, Math.round(100 * r) / 100);
      if (l >= a) return null;
      return { price: l, original: a, tier: state.tier, type: n.type, value: n.value };
    },
    [state]
  );

  return <MPCtx.Provider value={{ tier: state.tier, getMemberPrice }}>{children}</MPCtx.Provider>;
}

export function useMemberPricing() {
  return useContext(MPCtx);
}
