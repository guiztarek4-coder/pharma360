import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Package, MapPin, LogOut, Plus, Trash2, Heart, Gift } from "lucide-react";
import { toast } from "sonner";
import api, { formatDA, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { WILAYAS } from "@/lib/site";
import StatusTracker from "@/components/StatusTracker";
import ProductCard from "@/components/ProductCard";
import { useFavorites } from "@/context/FavoritesContext";
import { LoyaltyContent } from "@/pages/Loyalty";

function AuthForm() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({ first_name: "", last_name: "", identifier: "", email: "", phone: "", password: "", referral_code: "" });
  const [resetLink, setResetLink] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      if (mode === "login") {
        await login(f.identifier, f.password);
        toast.success("Connexion réussie");
      } else if (mode === "forgot") {
        const { data } = await api.post("/auth/forgot-password", { email: f.email });
        if (data.reset_link) {
          setResetLink(data.reset_link);
          toast.success("Lien de réinitialisation prêt");
        } else {
          toast.success(data.message || "Aucun compte trouvé pour cet email.");
        }
      } else {
        await register({ first_name: f.first_name, last_name: f.last_name, email: f.email || null, phone: f.phone || null, password: f.password, referral_code: f.referral_code || null });
        toast.success("Compte créé avec succès");
      }
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail));
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <h1 className="font-display font-extrabold text-2xl text-center mb-1">{mode === "login" ? "Connexion" : "Créer un compte"}</h1>
        <p className="text-slate-500 text-sm text-center mb-6">{mode === "login" ? "Accédez à votre espace Pharma360" : "Rejoignez Pharma360 en quelques secondes"}</p>

        <div className="flex bg-mint-50 rounded-full p-1 mb-6">
          <button onClick={() => setMode("login")} className={`flex-1 py-2 rounded-full text-sm font-semibold ${mode === "login" ? "bg-white shadow text-mint-700" : "text-slate-500"}`} data-testid="tab-login">Connexion</button>
          <button onClick={() => setMode("register")} className={`flex-1 py-2 rounded-full text-sm font-semibold ${mode === "register" ? "bg-white shadow text-mint-700" : "text-slate-500"}`} data-testid="tab-register">Inscription</button>
        </div>

        {err && <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm" data-testid="auth-error">{err}</div>}

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Prénom" value={f.first_name} onChange={set("first_name")} required testid="reg-firstname" />
                <Input label="Nom" value={f.last_name} onChange={set("last_name")} required testid="reg-lastname" />
              </div>
              <Input label="Email (optionnel)" type="email" value={f.email} onChange={set("email")} testid="reg-email" />
              <Input label="Téléphone (optionnel)" value={f.phone} onChange={set("phone")} testid="reg-phone" placeholder="05XX XX XX XX" />
              <Input label="Mot de passe" type="password" value={f.password} onChange={set("password")} required testid="reg-password" />
              <Input label="Code de parrainage (optionnel)" value={f.referral_code} onChange={set("referral_code")} testid="reg-referral" placeholder="P360-XXXXXX" />
              <p className="text-xs text-slate-400">Renseignez au moins un email ou un numéro de téléphone.</p>
            </>
          ) : mode === "forgot" ? (
            <>
              <p className="text-sm text-slate-500">Saisissez votre email : vous obtiendrez un lien pour créer un nouveau mot de passe.</p>
              <Input label="Email" type="email" value={f.email} onChange={set("email")} required testid="forgot-email" />
              {resetLink && (
                <div className="p-4 rounded-xl bg-mint-50 border border-mint-200 space-y-3" data-testid="reset-link-box">
                  <p className="text-sm text-slate-600">Votre lien est prêt. Cliquez pour définir un nouveau mot de passe :</p>
                  <button type="button" onClick={() => navigate(resetLink.replace(/^https?:\/\/[^/]+/, ""))}
                    data-testid="reset-link-btn"
                    className="w-full py-2.5 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold text-sm">
                    Créer un nouveau mot de passe
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <Input label="Email ou téléphone" value={f.identifier} onChange={set("identifier")} required testid="login-identifier" />
              <Input label="Mot de passe" type="password" value={f.password} onChange={set("password")} required testid="login-password" />
              <button type="button" onClick={() => { setErr(""); setMode("forgot"); }} data-testid="forgot-link" className="text-sm text-mint-700 hover:underline">Mot de passe oublié ?</button>
            </>
          )}
          <button type="submit" disabled={loading} data-testid="auth-submit"
            className="w-full py-3 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold shadow-lg shadow-mint-600/30 disabled:opacity-50">
            {loading ? "…" : mode === "login" ? "Se connecter" : mode === "forgot" ? "Envoyer le lien" : "Créer mon compte"}
          </button>
          {mode === "forgot" && <button type="button" onClick={() => setMode("login")} className="w-full text-sm text-slate-500">Retour à la connexion</button>}
        </form>
      </div>
    </div>
  );
}

function Input({ label, testid, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
      <input {...props} data-testid={testid} className="w-full px-4 py-2.5 rounded-xl border border-mint-200 outline-none focus:ring-2 focus:ring-mint-500" />
    </div>
  );
}

function Dashboard() {
  const { user, logout } = useAuth();
  const { ids: favIds } = useFavorites();
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [showAddr, setShowAddr] = useState(false);
  const [addr, setAddr] = useState({ label: "Domicile", full_name: "", phone: "", wilaya: "Alger", commune: "", street: "" });

  useEffect(() => {
    api.get("/orders/mine").then((r) => setOrders(r.data)).catch(() => {});
    api.get("/account/addresses").then((r) => setAddresses(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get("/favorites").then((r) => setFavorites(r.data)).catch(() => {});
  }, [favIds]);

  const saveAddr = async () => {
    if (!addr.full_name || !addr.phone || !addr.street) { toast.error("Champs requis manquants"); return; }
    const { data } = await api.post("/account/addresses", addr);
    setAddresses(data); setShowAddr(false);
    setAddr({ label: "Domicile", full_name: "", phone: "", wilaya: "Alger", commune: "", street: "" });
    toast.success("Adresse ajoutée");
  };
  const delAddr = async (aid) => { const { data } = await api.delete(`/account/addresses/${aid}`); setAddresses(data); };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-mint-600 grid place-items-center text-white font-display font-bold text-xl">{user.first_name?.[0]}</div>
          <div>
            <h1 className="font-display font-extrabold text-xl sm:text-2xl">Bonjour, {user.first_name}</h1>
            <p className="text-slate-500 text-sm">{user.email || user.phone}</p>
          </div>
        </div>
        <button onClick={logout} data-testid="logout-button" className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-500"><LogOut className="w-4 h-4" /> Déconnexion</button>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("orders")} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${tab === "orders" ? "bg-mint-600 text-white" : "bg-white border border-mint-200"}`} data-testid="tab-orders"><Package className="w-4 h-4" /> Mes commandes</button>
        <button onClick={() => setTab("addresses")} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${tab === "addresses" ? "bg-mint-600 text-white" : "bg-white border border-mint-200"}`} data-testid="tab-addresses"><MapPin className="w-4 h-4" /> Mes adresses</button>
        <button onClick={() => setTab("favorites")} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${tab === "favorites" ? "bg-mint-600 text-white" : "bg-white border border-mint-200"}`} data-testid="tab-favorites"><Heart className="w-4 h-4" /> Mes favoris</button>
        <button onClick={() => setTab("loyalty")} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${tab === "loyalty" ? "bg-mint-600 text-white" : "bg-white border border-mint-200"}`} data-testid="tab-loyalty"><Gift className="w-4 h-4" /> Fidélité</button>
      </div>

      {tab === "orders" && (
        <div className="space-y-4">
          {orders.length === 0 ? <p className="text-slate-400 text-center py-12">Aucune commande pour le moment.</p> :
            orders.map((o) => (
              <div key={o.id} className="bg-white rounded-2xl border border-slate-200/80 p-5" data-testid={`order-${o.id}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div><span className="text-xs text-slate-400 font-mono-label">#{o.id.slice(-8).toUpperCase()}</span><div className="text-sm text-slate-500">{new Date(o.created_at).toLocaleDateString("fr-FR")}</div></div>
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">{o.status}</span>
                </div>
                <div className="mt-3 text-sm text-slate-600">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</div>
                <div className="mt-4 pt-4 border-t border-mint-50"><StatusTracker status={o.status} /></div>
                <div className="mt-3 flex justify-between items-center"><span className="text-xs text-slate-400">{o.payment_method === "card" ? "Carte (démo)" : "À la livraison"}</span><span className="font-display font-bold text-mint-700">{formatDA(o.total)}</span></div>
              </div>
            ))}
        </div>
      )}

      {tab === "addresses" && (
        <div className="space-y-4">
          {addresses.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 flex justify-between items-start" data-testid={`address-${a.id}`}>
              <div>
                <div className="font-semibold">{a.label} · {a.full_name}</div>
                <div className="text-sm text-slate-500">{a.street}, {a.commune} {a.wilaya}</div>
                <div className="text-sm text-slate-400">{a.phone}</div>
              </div>
              <button onClick={() => delAddr(a.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {showAddr ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Input label="Nom complet" value={addr.full_name} onChange={(e) => setAddr({ ...addr, full_name: e.target.value })} testid="addr-name" />
                <Input label="Téléphone" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} testid="addr-phone" />
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Wilaya</label>
                  <select value={addr.wilaya} onChange={(e) => setAddr({ ...addr, wilaya: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-mint-200 bg-white">
                    {WILAYAS.map((w) => <option key={w}>{w}</option>)}
                  </select>
                </div>
                <Input label="Commune" value={addr.commune} onChange={(e) => setAddr({ ...addr, commune: e.target.value })} testid="addr-commune" />
              </div>
              <Input label="Adresse" value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} testid="addr-street" />
              <div className="flex gap-2">
                <button onClick={saveAddr} data-testid="addr-save" className="px-5 py-2.5 rounded-full bg-mint-600 text-white font-semibold text-sm">Enregistrer</button>
                <button onClick={() => setShowAddr(false)} className="px-5 py-2.5 rounded-full border border-mint-200 font-semibold text-sm">Annuler</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddr(true)} data-testid="add-address-button" className="flex items-center gap-2 px-5 py-3 rounded-full bg-white border border-mint-200 font-semibold text-sm hover:border-mint-400"><Plus className="w-4 h-4" /> Ajouter une adresse</button>
          )}
        </div>
      )}

      {tab === "favorites" && (
        <div data-testid="favorites-panel">
          {favorites.length === 0 ? (
            <p className="text-slate-400 text-center py-12">Vous n'avez pas encore de favoris. Cliquez sur le cœur d'un produit pour l'ajouter.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {favorites.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      )}

      {tab === "loyalty" && <div data-testid="loyalty-panel"><LoyaltyContent /></div>}
    </div>
  );
}

export default function Account() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (user && user.role === "admin") navigate("/admin"); }, [user]);
  if (loading) return <div className="py-24 text-center text-slate-400">Chargement…</div>;
  return user ? <Dashboard /> : <AuthForm />;
}
