import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const MemberPricingContext = createContext({ tier: null, getMemberPrice: () => null });
export const useMemberPricing = () => useContext(MemberPricingContext);

export function MemberPricingProvider({ children }) {
  const { user } = useAuth();
  const [data, setData] = useState({ tier: null, discounts: {} });

  useEffect(() => {
    if (!user) { setData({ tier: null, discounts: {} }); return; }
    api.get("/loyalty/member-pricing").then((r) => setData(r.data || { tier: null, discounts: {} })).catch(() => setData({ tier: null, discounts: {} }));
  }, [user]);

  const getMemberPrice = (product) => {
    if (!product) return null;
    const rule = data.discounts?.[product.id];
    if (!rule) return null;
    const base = Number(product.price) || 0;
    const price = rule.type === "percent" ? base - base * Number(rule.value) / 100 : base - Number(rule.value);
    const final = Math.max(0, Math.round(price * 100) / 100);
    if (final >= base) return null;
    return { price: final, original: base, tier: data.tier, type: rule.type, value: rule.value };
  };

  return (
    <MemberPricingContext.Provider value={{ tier: data.tier, getMemberPrice }}>
      {children}
    </MemberPricingContext.Provider>
  );
}
