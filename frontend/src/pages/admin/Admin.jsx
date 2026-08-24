import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, MessageCircle, Award, Palette, Leaf } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Dashboard from "./Dashboard";
import Products from "./Products";
import Orders from "./Orders";
import AdminChat from "./AdminChat";
import LoyaltyAdmin from "./LoyaltyAdmin";
import ThemeAdmin from "./ThemeAdmin";

const TABS = [
  { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, testid: "admin-tab-dashboard" },
  { key: "produits", label: "Produits & Stocks", icon: Package, testid: "admin-tab-produits" },
  { key: "commandes", label: "Commandes", icon: ShoppingCart, testid: "admin-tab-commandes" },
  { key: "chat", label: "Chat clients", icon: MessageCircle, testid: "admin-tab-chat" },
  { key: "fidelite", label: "Fidélité", icon: Award, testid: "admin-tab-fidelite" },
  { key: "theme", label: "Thème & Site", icon: Palette, testid: "admin-tab-theme" },
];

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("dashboard");

  useEffect(() => {
    if (user === false) navigate("/auth");
    else if (user && user.role !== "admin") navigate("/");
  }, [user, navigate]);

  if (!user || user.role !== "admin") return null;

  return (
    <div className="mx-auto max-w-7xl px-6 pb-24 pt-32" data-testid="admin-page">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-bone"><Leaf size={20} /></span>
        <div>
          <p className="badge-mono text-terra">Back-office</p>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-obsidian sm:text-3xl">Administration L'olivier</h1>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2" data-testid="admin-tabs">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} data-testid={t.testid}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-all ${tab === t.key ? "bg-brand text-bone" : "border bg-white text-obsidian/70 hover:border-brand hover:text-brand"}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "dashboard" && <Dashboard />}
        {tab === "produits" && <Products />}
        {tab === "commandes" && <Orders />}
        {tab === "chat" && <AdminChat />}
        {tab === "fidelite" && <LoyaltyAdmin />}
        {tab === "theme" && <ThemeAdmin />}
      </div>
    </div>
  );
}
