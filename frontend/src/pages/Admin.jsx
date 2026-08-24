import { useEffect, useState, useRef } from "react";
import { LayoutDashboard, Package, ShoppingBag, Tag, FileText, LogOut, Plus, Pencil, Trash2, X, Upload, TrendingUp, Users, Leaf, Settings, FolderTree, Ticket, Bell, Image as ImageIcon, UserCog, ChevronRight, GripVertical, Download, FileSpreadsheet, AlertCircle, AlertTriangle, Truck, MapPin, Compass, PanelBottom, ExternalLink, Gift, MessageCircle, Send, Sparkles, Eye, EyeOff, BarChart3, Crown, Search } from "lucide-react";
import { toast } from "sonner";
import api, { formatDA, formatApiError, mediaUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useCategories } from "@/context/CategoriesContext";
import { WILAYAS } from "@/lib/site";
import BulkProductSelector from "@/components/admin/BulkProductSelector";

const inp = "w-full px-3 py-2 rounded-xl border border-mint-200 text-sm outline-none focus:ring-2 focus:ring-mint-500";
const L = ({ label, children }) => (<div><label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>{children}</div>);
const PwInput = ({ testid, ...props }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} data-testid={testid} className={`${inp} pr-10`} />
      <button type="button" onClick={() => setShow((s) => !s)} data-testid={testid ? `${testid}-toggle` : undefined} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-mint-600">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
    </div>
  );
};

function AdminLogin() {
  const { login } = useAuth();
  const [f, setF] = useState({ identifier: "", password: "" });
  const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setErr("");
    try { const u = await login(f.identifier, f.password); if (u.role !== "admin") setErr("Ce compte n'est pas administrateur."); }
    catch (e) { setErr(formatApiError(e.response?.data?.detail)); }
  };
  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
        <div className="flex items-center gap-2 justify-center mb-6"><span className="w-9 h-9 rounded-xl bg-mint-600 grid place-items-center"><Leaf className="w-5 h-5 text-white" /></span><span className="font-display font-extrabold text-xl">Pharma360 Admin</span></div>
        {err && <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">{err}</div>}
        <form onSubmit={submit} className="space-y-4">
          <input placeholder="Email admin" value={f.identifier} onChange={(e) => setF({ ...f, identifier: e.target.value })} data-testid="admin-login-email" className={inp} />
          <PwInput placeholder="Mot de passe" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} testid="admin-login-password" />
          <button data-testid="admin-login-submit" className="w-full py-3 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold">Se connecter</button>
        </form>
      </div>
    </div>
  );
}

function ImageUpload({ value, onChange }) {
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  const upload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setBusy(true);
    const fd = new FormData(); fd.append("file", file);
    try { const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } }); onChange(data.url); toast.success("Image téléchargée"); }
    catch { toast.error("Échec du téléchargement"); }
    finally { setBusy(false); }
  };
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {value && <img src={mediaUrl(value)} alt="" className="w-16 h-16 rounded-xl object-cover border border-mint-100" />}
      <input ref={ref} type="file" accept="image/*" onChange={upload} className="hidden" data-testid="admin-image-input" />
      <button type="button" onClick={() => ref.current.click()} disabled={busy} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-mint-200 text-sm font-medium hover:border-mint-400">
        <Upload className="w-4 h-4" /> {busy ? "…" : "Téléverser"}
      </button>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="ou coller une URL" className="flex-1 min-w-[140px] px-3 py-2 rounded-xl border border-mint-200 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
    </div>
  );
}

const emptyProduct = { name: "", brand: "", category: "", category_id: "", subcategory: "", description: "", price: 0, old_price: null, stock: 0, images: [], badge: "", is_featured: false, is_new: false, need: "", complementary_ids: [] };

function ComplementarySelector({ value, onChange }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const ids = value || [];

  useEffect(() => {
    if (ids.length === 0) { setSelected([]); return; }
    Promise.all(ids.map((id) => api.get(`/products/${id}`).then((r) => r.data).catch(() => null)))
      .then((arr) => setSelected(arr.filter(Boolean)));
  }, [JSON.stringify(ids)]);

  useEffect(() => {
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(() => { api.get(`/products?search=${encodeURIComponent(q)}&limit=8`).then((r) => setResults(r.data)); }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const add = (p) => { if (!ids.includes(p.id)) onChange([...ids, p.id]); setQ(""); setResults([]); };
  const remove = (id) => onChange(ids.filter((x) => x !== id));

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {selected.map((p) => (
          <span key={p.id} data-testid={`pf-comp-chip-${p.id}`} className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-mint-100 text-mint-800 text-xs font-medium">
            {p.name}
            <button type="button" onClick={() => remove(p.id)} className="w-4 h-4 rounded-full bg-white/60 grid place-items-center hover:bg-white"><X className="w-3 h-3" /></button>
          </span>
        ))}
        {selected.length === 0 && <span className="text-xs text-slate-400">Aucun produit complémentaire</span>}
      </div>
      <div className="relative">
        <input value={q} onChange={(e) => setQ(e.target.value)} data-testid="pf-comp-search" placeholder="Rechercher un produit à associer…" className={inp} />
        {results.length > 0 && (
          <div className="absolute z-10 left-0 right-0 mt-1 bg-white rounded-xl border border-mint-100 shadow-lg max-h-52 overflow-auto">
            {results.map((p) => (
              <button type="button" key={p.id} onClick={() => add(p)} data-testid={`pf-comp-result-${p.id}`} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-mint-50">
                <img src={mediaUrl(p.images?.[0])} alt="" className="w-8 h-8 rounded object-cover bg-mint-50" />
                <span className="line-clamp-1">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


function CategoryPathSelector({ value, onChange }) {
  const { categories, findById, getAncestors } = useCategories();
  const path = value ? getAncestors(value) : [];
  // Build the chain of selects: level 0 = top categories, then children of each selected node.
  const levels = [{ opts: categories, selectedId: path[0]?.id || "" }];
  for (let i = 0; i < path.length; i++) {
    const n = path[i];
    if (n?.children?.length) levels.push({ opts: n.children, selectedId: path[i + 1]?.id || "" });
  }
  const levelLabels = ["Catégorie", "Sous-catégorie", "Sous-sous-catégorie"];
  const leaf = value ? findById(value) : null;
  const isLeaf = leaf && (!leaf.children || leaf.children.length === 0);
  return (
    <div className="space-y-2">
      {levels.map((lv, i) => (
        <L key={i} label={levelLabels[i] || `Niveau ${i + 1}`}>
          <select value={lv.selectedId} onChange={(e) => onChange(e.target.value)} data-testid={`pf-cat-level-${i}`} className={inp}>
            <option value="">— Choisir —</option>
            {lv.opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </L>
      ))}
      {value && !isLeaf && <p className="text-xs text-amber-600">Sélectionnez jusqu'au dernier niveau (catégorie sans sous-catégorie).</p>}
    </div>
  );
}

function ProductForm({ product, brands, categories, onClose, onSaved }) {
  const { findById } = useCategories();
  const [f, setF] = useState(product || { ...emptyProduct });
  const set = (k, v) => setF({ ...f, [k]: v });
  const save = async () => {
    if (!f.name || !f.price) { toast.error("Nom et prix requis"); return; }
    const leaf = f.category_id ? findById(f.category_id) : null;
    if (!f.category_id || !leaf) { toast.error("Choisissez une catégorie"); return; }
    if (leaf.children && leaf.children.length > 0) { toast.error("Choisissez la catégorie la plus profonde (sans sous-catégorie)"); return; }
    const payload = { ...f, price: Number(f.price), old_price: f.old_price ? Number(f.old_price) : null, stock: Number(f.stock), badge: f.badge || null, need: f.need || null, category_id: f.category_id, category: leaf.slug, subcategory: null, complementary_ids: f.complementary_ids || [] };
    try {
      if (f.id) await api.put(`/products/${f.id}`, payload); else await api.post("/products", payload);
      toast.success("Produit enregistré"); onSaved();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  return (
    <Modal title={f.id ? "Modifier le produit" : "Nouveau produit"} onClose={onClose} wide>
      <L label="Nom"><input value={f.name} onChange={(e) => set("name", e.target.value)} data-testid="pf-name" className={inp} /></L>
      <L label="Marque"><input list="brandlist" value={f.brand} onChange={(e) => set("brand", e.target.value)} className={inp} />
        <datalist id="brandlist">{brands.map((b) => <option key={b.id} value={b.name} />)}</datalist></L>
      <CategoryPathSelector value={f.category_id} onChange={(id) => set("category_id", id)} />
      <div className="grid grid-cols-3 gap-3">
        <L label="Prix (DA)"><input type="number" value={f.price} onChange={(e) => set("price", e.target.value)} data-testid="pf-price" className={inp} /></L>
        <L label="Ancien prix"><input type="number" value={f.old_price || ""} onChange={(e) => set("old_price", e.target.value)} className={inp} /></L>
        <L label="Stock"><input type="number" value={f.stock} onChange={(e) => set("stock", e.target.value)} data-testid="pf-stock" className={inp} /></L>
      </div>
      <L label="Description"><textarea rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} className={inp} /></L>
      <L label="Image"><ImageUpload value={f.images?.[0]} onChange={(url) => set("images", url ? [url] : [])} /></L>
      <div className="grid grid-cols-2 gap-3">
        <L label="Badge"><input value={f.badge || ""} onChange={(e) => set("badge", e.target.value)} placeholder="PROMO, COUP DE COEUR..." className={inp} /></L>
        <L label="Besoin"><input value={f.need || ""} onChange={(e) => set("need", e.target.value)} className={inp} /></L>
      </div>
      <div className="flex gap-5">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_featured} onChange={(e) => set("is_featured", e.target.checked)} className="accent-mint-600 w-4 h-4" /> Coup de cœur</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_new} onChange={(e) => set("is_new", e.target.checked)} className="accent-mint-600 w-4 h-4" /> Nouveauté</label>
      </div>
      <L label="Produits complémentaires recommandés"><BulkProductSelector value={f.complementary_ids} onChange={(v) => set("complementary_ids", v)} testid="pf-comp" /></L>
      <button onClick={save} data-testid="pf-save" className="w-full py-3 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold">Enregistrer</button>
    </Modal>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] overflow-auto p-6 space-y-3`}>
        <div className="flex items-center justify-between mb-1"><h3 className="font-display font-bold text-lg">{title}</h3><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        {children}
      </div>
    </div>
  );
}

export default function Admin() {
  const { user, loading } = useAuth();
  if (loading) return <div className="py-24 text-center text-slate-400">Chargement…</div>;
  if (!user || user.role !== "admin") return <AdminLogin />;
  return <Dashboard />;
}

function Dashboard() {
  const { user, logout } = useAuth();
  const { refresh: refreshCats, categories } = useCategories();
  const [tab, setTab] = useState("stats");
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [brands, setBrands] = useState([]);
  const [blog, setBlog] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [promos, setPromos] = useState([]);
  const [notifs, setNotifs] = useState({ notifications: [], unread: 0 });
  const [chatUnread, setChatUnread] = useState(0);  const [editing, setEditing] = useState(null);
  const [importKind, setImportKind] = useState(null);
  const [lowOnly, setLowOnly] = useState(false);
  const [brandForm, setBrandForm] = useState(null);
  const [blogForm, setBlogForm] = useState(null);

  const loadAll = () => {
    api.get("/admin/stats").then((r) => setStats(r.data));
    api.get("/products?limit=300").then((r) => setProducts(r.data));
    api.get("/orders").then((r) => setOrders(r.data));
    api.get("/brands").then((r) => setBrands(r.data));
    api.get("/blog").then((r) => setBlog(r.data));
    api.get("/customers").then((r) => setCustomers(r.data));
    api.get("/promo-codes").then((r) => setPromos(r.data));
    api.get("/notifications").then((r) => setNotifs(r.data));
    api.get("/admin/chat/unread-count").then((r) => setChatUnread(r.data.count || 0)).catch(() => {});
    refreshCats();
  };
  useEffect(loadAll, []);

  const delProduct = async (id) => { await api.delete(`/products/${id}`); loadAll(); toast.success("Supprimé"); };
  const setStatus = async (id, status) => { await api.put(`/orders/${id}/status`, { status }); loadAll(); };
  const delOrder = async (id) => { if (!window.confirm("Supprimer définitivement cette commande ? Elle sera retirée du chiffre d'affaires et des statistiques.")) return; await api.delete(`/orders/${id}`); loadAll(); toast.success("Commande supprimée"); };
  const delBrand = async (id) => { await api.delete(`/brands/${id}`); loadAll(); };
  const delBlog = async (id) => { await api.delete(`/blog/${id}`); loadAll(); };
  const openTab = (t) => { setTab(t); if (t === "notifications" && notifs.unread) api.post("/notifications/read").then(() => api.get("/notifications").then((r) => setNotifs(r.data))); };

  const tabs = [
    { id: "stats", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "analytics", label: "Statistiques", icon: BarChart3 },
    { id: "orders", label: "Commandes", icon: ShoppingBag },
    { id: "products", label: "Produits", icon: Package },
    { id: "customers", label: "Clients", icon: Users },
    { id: "brands", label: "Marques", icon: Tag },
    { id: "categories", label: "Catégories", icon: FolderTree },
    { id: "delivery", label: "Livraison", icon: Truck },
    { id: "promo", label: "Codes promo", icon: Ticket },
    { id: "loyalty", label: "Fidélité", icon: Gift },
    { id: "gifts", label: "Cadeaux", icon: Sparkles },
    { id: "blog", label: "Blog", icon: FileText },
    { id: "banners", label: "Bannières", icon: ImageIcon },
    { id: "footer", label: "Footer & Pages", icon: PanelBottom },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "settings", label: "Paramètres", icon: Settings },
    { id: "account", label: "Compte", icon: UserCog },
  ];

  return (
    <div className="min-h-screen bg-mint-50/30">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2"><span className="w-9 h-9 rounded-xl bg-mint-600 grid place-items-center"><Leaf className="w-5 h-5 text-white" /></span><h1 className="font-display font-extrabold text-lg sm:text-xl">Pharma360 Admin</h1></div>
          <button onClick={logout} data-testid="admin-logout" className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-500"><LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Déconnexion</span></button>
        </div>

        <div className="flex gap-2 overflow-auto no-scrollbar mb-6 pb-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => openTab(t.id)} data-testid={`admin-tab-${t.id}`}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${tab === t.id ? "bg-mint-600 text-white" : "bg-white border border-mint-200 text-slate-600"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
              {t.id === "notifications" && notifs.unread > 0 && <span className="ml-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] grid place-items-center">{notifs.unread}</span>}
              {t.id === "products" && stats?.low_stock > 0 && <span data-testid="products-low-stock-badge" className={`ml-1 w-5 h-5 rounded-full text-[10px] grid place-items-center ${tab === t.id ? "bg-white/25 text-white" : "bg-red-500 text-white"}`}>{stats.low_stock}</span>}
              {t.id === "chat" && chatUnread > 0 && <span data-testid="chat-unread-badge" className="ml-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] grid place-items-center">{chatUnread}</span>}
            </button>
          ))}
        </div>

        {tab === "stats" && stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[[TrendingUp, "Chiffre d'affaires (livré)", formatDA(stats.revenue)], [ShoppingBag, "Commandes", stats.orders], [Package, "Produits", stats.products], [Users, "Clients", stats.customers], [ShoppingBag, "En attente", stats.pending_orders], [Tag, "Marques", stats.brands]].map(([Icon, label, val], i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-5" data-testid={`stat-${i}`}>
                <Icon className="w-5 h-5 text-mint-600 mb-3" />
                <div className="font-display font-extrabold text-2xl">{val}</div>
                <div className="text-sm text-slate-500">{label}</div>
              </div>
            ))}
            <button onClick={() => { setLowOnly(true); setTab("products"); }} data-testid="stat-low-stock"
              className={`text-left rounded-2xl border p-5 transition-colors ${stats.low_stock > 0 ? "bg-red-50 border-red-200 hover:border-red-400" : "bg-white border-slate-200/80"}`}>
              <AlertTriangle className={`w-5 h-5 mb-3 ${stats.low_stock > 0 ? "text-red-500" : "text-mint-600"}`} />
              <div className={`font-display font-extrabold text-2xl ${stats.low_stock > 0 ? "text-red-600" : ""}`}>{stats.low_stock ?? 0}</div>
              <div className="text-sm text-slate-500">Stock bas (≤ {stats.low_stock_threshold ?? 5})</div>
            </button>
          </div>
        )}

        {tab === "products" && (() => {
          const threshold = stats?.low_stock_threshold ?? 5;
          const lowCount = products.filter((p) => p.stock <= threshold).length;
          const shown = lowOnly ? products.filter((p) => p.stock <= threshold) : products;
          return (
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => setEditing(emptyProduct)} data-testid="admin-add-product" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-mint-600 text-white font-semibold text-sm"><Plus className="w-4 h-4" /> Ajouter un produit</button>
              <button onClick={() => setImportKind("products")} data-testid="admin-import-products" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-mint-200 text-slate-700 font-semibold text-sm hover:border-mint-400"><Upload className="w-4 h-4" /> Importer (CSV / Excel)</button>
              <button onClick={() => setLowOnly(!lowOnly)} data-testid="admin-filter-low-stock"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm border ${lowOnly ? "bg-red-500 text-white border-red-500" : "bg-white border-mint-200 text-slate-700 hover:border-red-300"}`}>
                <AlertTriangle className="w-4 h-4" /> Stock bas {lowCount > 0 && <span className={`ml-1 px-1.5 rounded-full text-[10px] ${lowOnly ? "bg-white/25" : "bg-red-100 text-red-600"}`}>{lowCount}</span>}
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]" data-testid="admin-products-table">
                <thead className="bg-mint-50 text-slate-500 text-xs uppercase"><tr><th className="text-left p-3">Produit</th><th className="text-left p-3 hidden sm:table-cell">Catégorie</th><th className="text-left p-3">Prix</th><th className="text-left p-3">Stock</th><th className="p-3"></th></tr></thead>
                <tbody>
                  {shown.map((p) => {
                    const low = p.stock <= threshold;
                    return (
                    <tr key={p.id} className={`border-t border-mint-50 ${low ? "bg-red-50/50" : ""}`}>
                      <td className="p-3"><div className="flex items-center gap-2"><img src={mediaUrl(p.images?.[0])} alt="" className="w-9 h-9 rounded-lg object-cover bg-mint-50" /><span className="font-medium line-clamp-1">{p.name}</span></div></td>
                      <td className="p-3 hidden sm:table-cell capitalize text-slate-500">{p.category}</td>
                      <td className="p-3 font-semibold text-mint-700 whitespace-nowrap">{formatDA(p.price)}</td>
                      <td className="p-3">{low ? <span className="inline-flex items-center gap-1 text-red-600 font-semibold" data-testid={`low-stock-${p.id}`}><AlertTriangle className="w-3.5 h-3.5" /> {p.stock}</span> : p.stock}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button onClick={() => setEditing(p)} data-testid={`admin-edit-${p.id}`} className="text-slate-400 hover:text-mint-700 mr-2"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => delProduct(p.id)} data-testid={`admin-del-${p.id}`} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          );
        })()}

        {tab === "analytics" && <AnalyticsPanel />}
        {tab === "orders" && (
          <div className="space-y-3">
            {orders.length === 0 && <p className="text-slate-400 text-center py-12">Aucune commande.</p>}
            {orders.map((o) => (
              <div key={o.id} className="bg-white rounded-2xl border border-slate-200/80 p-5" data-testid={`admin-order-${o.id}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div><span className="font-mono-label text-xs text-slate-400">#{o.id.slice(-8).toUpperCase()}</span><div className="font-semibold">{o.full_name} · {o.phone}</div><div className="text-sm text-slate-500">{o.delivery_method === "pickup" ? "Retrait pharmacie" : `${o.street||""}, ${o.commune||""} ${o.wilaya}`}</div></div>
                  <div className="text-right"><div className="font-display font-bold text-mint-700">{formatDA(o.total)}</div><div className="text-xs text-slate-400">{o.payment_method === "card" ? "Carte (démo)" : "À la livraison"} · {o.delivery_method}</div></div>
                </div>
                <div className="mt-3 text-sm text-slate-600">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</div>
                {o.promo_code ? <div className="text-xs text-mint-700 mt-1">Code promo : {o.promo_code} (-{formatDA(o.discount||0)})</div> : null}
                <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                  <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} data-testid={`admin-order-status-${o.id}`} className="px-3 py-1.5 rounded-full border border-mint-200 text-sm bg-white">
                    {["En attente", "Confirmée", "Expédiée", "Livrée", "Annulée"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <button onClick={() => delOrder(o.id)} data-testid={`admin-order-delete-${o.id}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50"><Trash2 className="w-4 h-4" /> Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "customers" && <CustomersPanel customers={customers} onChanged={loadAll} />}

        {tab === "brands" && (
          <div>
            <button onClick={() => setBrandForm({ name: "", logo: "", description: "" })} data-testid="admin-add-brand" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-mint-600 text-white font-semibold text-sm mb-4"><Plus className="w-4 h-4" /> Ajouter une marque</button>
            <div className="grid sm:grid-cols-3 gap-3">
              {brands.map((b) => (
                <div key={b.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">{b.logo && <img src={mediaUrl(b.logo)} alt="" className="w-10 h-10 object-contain" />}<span className="font-semibold truncate">{b.name}</span></div>
                  <div className="shrink-0"><button onClick={() => setBrandForm(b)} className="text-slate-400 hover:text-mint-700 mr-2"><Pencil className="w-4 h-4" /></button><button onClick={() => delBrand(b.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "categories" && <CategoriesPanel categories={categories} onChanged={loadAll} onImport={() => setImportKind("categories")} />}
        {tab === "delivery" && <DeliveryPanel />}
        {tab === "promo" && <PromoPanel promos={promos} onChanged={loadAll} />}
        {tab === "loyalty" && <LoyaltyAdminPanel />}
        {tab === "gifts" && <GiftAdminPanel />}

        {tab === "blog" && (
          <div>
            <button onClick={() => setBlogForm({ title: "", excerpt: "", content: "", image: "", author: "Équipe Pharma360" })} data-testid="admin-add-blog" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-mint-600 text-white font-semibold text-sm mb-4"><Plus className="w-4 h-4" /> Nouvel article</button>
            <div className="space-y-3">
              {blog.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">{p.image && <img src={mediaUrl(p.image)} alt="" className="w-12 h-12 rounded-lg object-cover" />}<span className="font-semibold line-clamp-1">{p.title}</span></div>
                  <div className="shrink-0"><button onClick={() => setBlogForm(p)} className="text-slate-400 hover:text-mint-700 mr-2"><Pencil className="w-4 h-4" /></button><button onClick={() => delBlog(p.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "banners" && <BannersPanel />}
        {tab === "footer" && <FooterPanel />}
        {tab === "notifications" && <NotificationsPanel notifs={notifs} />}
        {tab === "chat" && <ChatAdminPanel />}
        {tab === "settings" && <SettingsPanel />}
        {tab === "account" && <AccountPanel />}
      </div>

      {editing && <ProductForm product={editing.id ? editing : null} brands={brands} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); loadAll(); }} />}
      {importKind && <ImportModal kind={importKind} onClose={() => setImportKind(null)} onDone={loadAll} />}
      {brandForm && <BrandForm brand={brandForm} onClose={() => setBrandForm(null)} onSaved={() => { setBrandForm(null); loadAll(); }} />}
      {blogForm && <BlogForm post={blogForm} onClose={() => setBlogForm(null)} onSaved={() => { setBlogForm(null); loadAll(); }} />}
    </div>
  );
}

function CustomersPanel({ customers, onChanged }) {
  const [selected, setSelected] = useState(null);
  const [orders, setOrders] = useState([]);
  const [manage, setManage] = useState(null);
  const [delta, setDelta] = useState("");
  const [override, setOverride] = useState("");
  const [busy, setBusy] = useState(false);
  const view = async (c) => { setSelected(c); const { data } = await api.get(`/customers/${c.id}/orders`); setOrders(data); };
  const openManage = (c) => { setManage(c); setDelta(""); setOverride(c.tier_override || ""); };
  const tierBadge = (t) => {
    const cls = t === "Gold" ? "bg-yellow-100 text-yellow-700" : t === "Silver" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700";
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{t || "—"}</span>;
  };
  const apply = async (kind) => {
    setBusy(true);
    try {
      const body = {};
      if (kind === "delta") { if (!delta) { toast.error("Entrez une valeur"); setBusy(false); return; } body.points_delta = Number(delta); }
      if (kind === "override") body.tier_override = override || null;
      const { data } = await api.put(`/customers/${manage.id}/loyalty`, body);
      toast.success("Client mis à jour");
      setManage({ ...manage, loyalty_points: data.loyalty_points, tier: data.tier, tier_override: data.tier_override });
      setDelta("");
      onChanged && onChanged();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };
  return (
    <div>
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]" data-testid="admin-customers-table">
          <thead className="bg-mint-50 text-slate-500 text-xs uppercase"><tr><th className="text-left p-3">Client</th><th className="text-left p-3">Contact</th><th className="text-left p-3">Points</th><th className="text-left p-3">Statut</th><th className="text-left p-3">Parrainage</th><th className="text-left p-3">Cmd</th><th className="p-3"></th></tr></thead>
          <tbody>
            {customers.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-400">Aucun client inscrit.</td></tr>}
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-mint-50" data-testid={`customer-${c.id}`}>
                <td className="p-3 font-medium">{c.first_name} {c.last_name}</td>
                <td className="p-3 text-slate-500">{c.email || c.phone || "—"}</td>
                <td className="p-3 font-semibold text-mint-700" data-testid={`customer-points-${c.id}`}>{c.loyalty_points ?? 0}</td>
                <td className="p-3" data-testid={`customer-tier-${c.id}`}>{tierBadge(c.tier)} {c.tier_override && <span className="text-[10px] text-slate-400">(manuel)</span>}</td>
                <td className="p-3 text-xs text-slate-500">
                  {c.referral_count > 0 && <div data-testid={`customer-refcount-${c.id}`}>{c.referral_count} filleul(s)</div>}
                  {c.referred_by_name && <div className="text-slate-400">parrainé par {c.referred_by_name}</div>}
                  {!c.referral_count && !c.referred_by_name && <span className="text-slate-300">—</span>}
                </td>
                <td className="p-3">{c.orders_count}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => openManage(c)} data-testid={`customer-manage-${c.id}`} className="text-mint-700 font-semibold text-sm mr-3">Gérer</button>
                  <button onClick={() => view(c)} className="text-slate-500 text-sm">Voir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <Modal title={`Commandes de ${selected.first_name} ${selected.last_name}`} onClose={() => setSelected(null)} wide>
          {orders.length === 0 ? <p className="text-slate-400">Aucune commande.</p> : orders.map((o) => (
            <div key={o.id} className="border border-mint-100 rounded-xl p-3 text-sm">
              <div className="flex justify-between"><span className="font-mono-label text-xs text-slate-400">#{o.id.slice(-8).toUpperCase()}</span><span className="font-semibold text-mint-700">{formatDA(o.total)}</span></div>
              <div className="text-slate-600">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</div>
              <div className="text-xs text-slate-400">{o.status} · {new Date(o.created_at).toLocaleDateString("fr-FR")}</div>
            </div>
          ))}
        </Modal>
      )}
      {manage && (
        <Modal title={`Fidélité — ${manage.first_name} ${manage.last_name}`} onClose={() => { setManage(null); }}>
          <div className="space-y-4" data-testid="customer-loyalty-modal">
            <div className="flex items-center justify-between bg-mint-50 rounded-xl p-3">
              <span className="text-sm text-slate-600">Solde actuel</span>
              <span className="font-display font-extrabold text-mint-700 text-xl" data-testid="manage-points">{manage.loyalty_points ?? 0} pts</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Statut actuel</span>
              {tierBadge(manage.tier)}
            </div>
            <div>
              <L label="Ajouter / retirer des points (ex: 100 ou -50)"><input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} className={inp} data-testid="manage-points-delta" /></L>
              <button onClick={() => apply("delta")} disabled={busy} data-testid="manage-points-apply" className="mt-2 px-4 py-2 rounded-full bg-mint-600 text-white text-sm font-semibold disabled:opacity-50">Appliquer</button>
            </div>
            <div className="border-t border-mint-100 pt-4">
              <L label="Forcer un statut (laisser 'Automatique' pour calcul selon les points)">
                <select value={override} onChange={(e) => setOverride(e.target.value)} className={inp} data-testid="manage-tier-override">
                  <option value="">Automatique</option>
                  <option value="BRONZE">BRONZE</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                </select>
              </L>
              <button onClick={() => apply("override")} disabled={busy} data-testid="manage-tier-apply" className="mt-2 px-4 py-2 rounded-full bg-slate-800 text-white text-sm font-semibold disabled:opacity-50">Enregistrer le statut</button>
            </div>
            {manage.referral_code && <p className="text-xs text-slate-400">Code de parrainage : <span className="font-mono font-semibold text-slate-600">{manage.referral_code}</span></p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

function ImportModal({ kind, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const ref = useRef();
  const label = kind === "categories" ? "catégories" : "produits";
  const dl = async (fmt) => {
    try {
      const { data } = await api.get(`/admin/import/template/${kind}?format=${fmt}`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const a = document.createElement("a"); a.href = url; a.download = `modele_${kind}.${fmt}`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Échec du téléchargement du modèle"); }
  };
  const upload = async () => {
    if (!file) { toast.error("Choisissez un fichier"); return; }
    setBusy(true); setResult(null);
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post(`/admin/import/${kind}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(data);
      toast.success(`${data.created} ${label} importé(s)`);
      onDone();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };
  return (
    <Modal title={`Importer des ${label}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-mint-50/60 rounded-xl p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-dark mb-1">1. Téléchargez le modèle</p>
          <p className="mb-3">Remplissez le fichier avec vos données puis importez-le ci-dessous.</p>
          <div className="flex gap-2">
            <button onClick={() => dl("csv")} data-testid="import-template-csv" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-mint-200 text-sm font-medium hover:border-mint-400"><Download className="w-4 h-4" /> Modèle CSV</button>
            <button onClick={() => dl("xlsx")} data-testid="import-template-xlsx" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-mint-200 text-sm font-medium hover:border-mint-400"><FileSpreadsheet className="w-4 h-4" /> Modèle Excel</button>
          </div>
        </div>
        <div>
          <p className="font-semibold text-slate-dark text-sm mb-2">2. Importez votre fichier (.csv, .xlsx)</p>
          <input ref={ref} type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files[0])} data-testid="import-file-input" className="hidden" />
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" onClick={() => ref.current.click()} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-mint-200 text-sm font-medium hover:border-mint-400"><Upload className="w-4 h-4" /> Choisir un fichier</button>
            {file && <span className="text-sm text-slate-500 truncate max-w-[180px]">{file.name}</span>}
          </div>
        </div>
        {result && (
          <div className="rounded-xl border border-slate-200 p-3 text-sm max-h-48 overflow-auto" data-testid="import-result">
            <p className="font-semibold text-mint-700">{result.created} {label} importé(s)</p>
            {result.errors && result.errors.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="font-semibold text-red-500 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {result.errors.length} ligne(s) ignorée(s) :</p>
                {result.errors.map((er, i) => <p key={i} className="text-xs text-red-500">Ligne {er.row} : {er.message}</p>)}
              </div>
            )}
          </div>
        )}
        <button onClick={upload} disabled={busy} data-testid="import-submit" className="w-full py-3 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold disabled:opacity-60">{busy ? "Import en cours…" : "Importer"}</button>
      </div>
    </Modal>
  );
}

function CategoriesPanel({ categories, onChanged, onImport }) {
  const { refresh, findById } = useCategories();
  const [form, setForm] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));
  const del = async (node) => {
    if (!confirm(`Supprimer « ${node.label} » et toutes ses sous-catégories ?`)) return;
    await api.delete(`/categories/${node.id}`); onChanged(); toast.success("Supprimée");
  };
  const addRoot = () => setForm({ label: "", image: "", order: 100, parent_id: null, level: 0, banner_image: "", banner_title: "", banner_subtitle: "", banner_cta_label: "", banner_cta_link: "" });
  const addChild = (parent) => setForm({ label: "", image: "", order: 100, parent_id: parent.id, level: parent.level + 1, banner_image: "", banner_title: "", banner_subtitle: "", banner_cta_label: "", banner_cta_link: "" });
  const edit = (node) => setForm({ id: node.id, label: node.label, image: node.image || "", order: node.order, parent_id: node.parent_id, level: node.level, banner_image: node.banner_image || "", banner_title: node.banner_title || "", banner_subtitle: node.banner_subtitle || "", banner_cta_label: node.banner_cta_label || "", banner_cta_link: node.banner_cta_link || "" });

  const siblingsOf = (pid) => (pid ? (findById(pid)?.children || []) : categories);

  const onDrop = async (target) => {
    const dragged = dragId ? findById(dragId) : null;
    setOverId(null);
    if (!dragged || dragged.id === target.id || dragged.parent_id !== target.parent_id) { setDragId(null); return; }
    const sibs = siblingsOf(target.parent_id).map((s) => s.id);
    const from = sibs.indexOf(dragged.id), to = sibs.indexOf(target.id);
    if (from < 0 || to < 0) { setDragId(null); return; }
    sibs.splice(to, 0, sibs.splice(from, 1)[0]);
    setDragId(null);
    try { await api.put("/categories/reorder", { ids: sibs }); await refresh(); onChanged(); toast.success("Ordre mis à jour"); }
    catch { toast.error("Échec du réordonnancement"); }
  };

  const rows = [];
  const walk = (nodes) => (nodes || []).forEach((n) => { rows.push(n); if (expanded[n.id]) walk(n.children); });
  walk(categories);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={addRoot} data-testid="admin-add-category" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-mint-600 text-white font-semibold text-sm"><Plus className="w-4 h-4" /> Ajouter une catégorie principale</button>
        <button onClick={onImport} data-testid="admin-import-categories" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-mint-200 text-slate-700 font-semibold text-sm hover:border-mint-400"><Upload className="w-4 h-4" /> Importer (CSV / Excel)</button>
      </div>
      <p className="text-xs text-slate-400 mb-3 flex items-center gap-1"><GripVertical className="w-3.5 h-3.5" /> Glissez-déposez pour réordonner (au sein d'un même niveau)</p>
      <div className="space-y-1">
        {rows.map((node) => {
          const hasChildren = node.children && node.children.length > 0;
          const pad = node.level === 0 ? "" : node.level === 1 ? "ml-5" : "ml-10";
          return (
            <div key={node.id}
              draggable
              onDragStart={() => setDragId(node.id)}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              onDragOver={(e) => { e.preventDefault(); if (node.parent_id === (dragId ? findById(dragId)?.parent_id : null)) setOverId(node.id); }}
              onDragLeave={() => setOverId((o) => (o === node.id ? null : o))}
              onDrop={(e) => { e.preventDefault(); onDrop(node); }}
              className={`${pad} flex items-center gap-2 p-3 bg-white rounded-xl border transition-colors ${overId === node.id ? "border-mint-500 bg-mint-50/50" : "border-slate-200/80"} ${dragId === node.id ? "opacity-50" : ""}`}
              data-testid={`admin-cat-${node.id}`}>
              <GripVertical className="w-4 h-4 text-slate-300 cursor-grab shrink-0" />
              {hasChildren ? (
                <button onClick={() => toggle(node.id)} className="text-slate-400"><ChevronRight className={`w-4 h-4 transition-transform ${expanded[node.id] ? "rotate-90" : ""}`} /></button>
              ) : <span className="w-4" />}
              {node.image && <img src={mediaUrl(node.image)} alt="" className="w-9 h-9 rounded-lg object-cover" />}
              <span className="font-semibold flex-1 text-sm">{node.label}</span>
              {node.level === 0 && (node.banner_title || node.banner_image) && <span className="text-[10px] font-mono-label px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 hidden sm:inline">Bannière</span>}
              <span className="text-[10px] font-mono-label px-2 py-0.5 rounded-full bg-mint-50 text-mint-700 hidden sm:inline">Niveau {node.level + 1}</span>
              {node.level < 2 && (
                <button onClick={() => addChild(node)} data-testid={`admin-add-child-${node.id}`} className="text-mint-600 hover:text-mint-800" title="Ajouter une sous-catégorie"><Plus className="w-4 h-4" /></button>
              )}
              <button onClick={() => edit(node)} className="text-slate-400 hover:text-mint-700"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => del(node)} data-testid={`admin-del-cat-${node.id}`} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          );
        })}
      </div>
      {form && <CategoryForm cat={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); onChanged(); }} />}
    </div>
  );
}

function CategoryForm({ cat, onClose, onSaved }) {
  const [f, setF] = useState(cat);
  const setV = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const titleLevel = ["catégorie principale", "sous-catégorie", "sous-sous-catégorie"][f.level] || "catégorie";
  const save = async () => {
    if (!f.label) { toast.error("Nom requis"); return; }
    const payload = {
      label: f.label, icon: "Tag", image: f.image || null, order: Number(f.order) || 100, parent_id: f.parent_id || null,
      banner_image: f.banner_image || null, banner_title: f.banner_title || null, banner_subtitle: f.banner_subtitle || null,
      banner_cta_label: f.banner_cta_label || null, banner_cta_link: f.banner_cta_link || null,
    };
    try {
      if (f.id) await api.put(`/categories/${f.id}`, payload); else await api.post("/categories", payload);
      toast.success("Catégorie enregistrée"); onSaved();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  return (
    <Modal title={f.id ? `Modifier la ${titleLevel}` : `Nouvelle ${titleLevel}`} onClose={onClose}>
      <L label="Nom"><input value={f.label} onChange={(e) => setV("label", e.target.value)} data-testid="cf-label" className={inp} /></L>
      <L label="Ordre d'affichage"><input type="number" value={f.order} onChange={(e) => setV("order", e.target.value)} className={inp} /></L>
      <L label="Image (carte)"><ImageUpload value={f.image} onChange={(url) => setV("image", url)} /></L>
      {f.level === 0 && (
        <div className="mt-2 pt-3 border-t border-mint-100 space-y-3">
          <p className="text-sm font-display font-bold text-slate-dark">Bannière de la page catégorie</p>
          <L label="Image de bannière"><ImageUpload value={f.banner_image} onChange={(url) => setV("banner_image", url)} /></L>
          <L label="Titre"><input value={f.banner_title} onChange={(e) => setV("banner_title", e.target.value)} data-testid="cf-banner-title" placeholder="ex: Soins du visage" className={inp} /></L>
          <L label="Sous-titre"><input value={f.banner_subtitle} onChange={(e) => setV("banner_subtitle", e.target.value)} placeholder="ex: Jusqu'à -30% cette semaine" className={inp} /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label="Texte du bouton"><input value={f.banner_cta_label} onChange={(e) => setV("banner_cta_label", e.target.value)} placeholder="ex: Voir les promos" className={inp} /></L>
            <L label="Lien du bouton"><input value={f.banner_cta_link} onChange={(e) => setV("banner_cta_link", e.target.value)} placeholder="ex: /catalogue?on_promo=1" className={inp} /></L>
          </div>
        </div>
      )}
      <button onClick={save} data-testid="cf-save" className="w-full py-3 rounded-full bg-mint-600 text-white font-semibold">Enregistrer</button>
    </Modal>
  );
}

function PromoPanel({ promos, onChanged }) {
  const [form, setForm] = useState(null);
  const del = async (id) => { await api.delete(`/promo-codes/${id}`); onChanged(); };
  return (
    <div>
      <button onClick={() => setForm({ code: "", type: "percent", value: 10, active: true })} data-testid="admin-add-promo" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-mint-600 text-white font-semibold text-sm mb-4"><Plus className="w-4 h-4" /> Ajouter un code promo</button>
      <div className="grid sm:grid-cols-2 gap-3">
        {promos.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between" data-testid={`promo-${p.id}`}>
            <div>
              <div className="font-mono-label font-bold text-mint-700">{p.code}</div>
              <div className="text-sm text-slate-500">{p.type === "percent" ? `${p.value}% de réduction` : `${formatDA(p.value)} de réduction`} · {p.active ? "Actif" : "Inactif"}</div>
            </div>
            <div><button onClick={() => setForm(p)} className="text-slate-400 hover:text-mint-700 mr-2"><Pencil className="w-4 h-4" /></button><button onClick={() => del(p.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div>
          </div>
        ))}
      </div>
      {form && <PromoForm promo={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); onChanged(); }} />}
    </div>
  );
}

function PromoForm({ promo, onClose, onSaved }) {
  const [f, setF] = useState(promo);
  const save = async () => {
    if (!f.code) { toast.error("Code requis"); return; }
    const payload = { code: f.code, type: f.type, value: Number(f.value), active: f.active };
    try { if (f.id) await api.put(`/promo-codes/${f.id}`, payload); else await api.post("/promo-codes", payload); toast.success("Code enregistré"); onSaved(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  return (
    <Modal title={f.id ? "Modifier le code promo" : "Nouveau code promo"} onClose={onClose}>
      <L label="Code"><input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} data-testid="prf-code" className={inp} /></L>
      <div className="grid grid-cols-2 gap-3">
        <L label="Type"><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={inp}><option value="percent">Pourcentage (%)</option><option value="fixed">Montant fixe (DA)</option></select></L>
        <L label="Valeur"><input type="number" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} data-testid="prf-value" className={inp} /></L>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="accent-mint-600 w-4 h-4" /> Actif</label>
      <button onClick={save} data-testid="prf-save" className="w-full py-3 rounded-full bg-mint-600 text-white font-semibold">Enregistrer</button>
    </Modal>
  );
}

function NotificationsPanel({ notifs }) {
  return (
    <div className="space-y-2" data-testid="admin-notifications">
      {notifs.notifications.length === 0 ? <p className="text-slate-400 text-center py-12">Aucune notification.</p> :
        notifs.notifications.map((n) => (
          <div key={n.id} className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${n.read ? "border-slate-200/80" : "border-mint-300 bg-mint-50/40"}`}>
            <Bell className={`w-4 h-4 ${n.read ? "text-slate-400" : "text-mint-600"}`} />
            <div className="flex-1"><div className="text-sm font-medium">{n.message}</div><div className="text-xs text-slate-400">{new Date(n.created_at).toLocaleString("fr-FR")}</div></div>
          </div>
        ))}
    </div>
  );
}

function BannersPanel() {
  const { refresh } = useSettings();
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get("/settings").then((r) => setF(r.data)); }, []);
  if (!f) return <p className="text-slate-400">Chargement…</p>;
  const setMsg = (i, v) => { const m = [...(f.top_bar_messages || [])]; m[i] = v; setF({ ...f, top_bar_messages: m }); };
  const addMsg = () => setF({ ...f, top_bar_messages: [...(f.top_bar_messages || []), ""] });
  const delMsg = (i) => setF({ ...f, top_bar_messages: f.top_bar_messages.filter((_, x) => x !== i) });
  const save = async () => { setBusy(true); try { await api.put("/settings", { hero_image: f.hero_image, hero_title: f.hero_title, hero_subtitle: f.hero_subtitle, top_bar_messages: (f.top_bar_messages || []).filter(Boolean) }); await refresh(); toast.success("Bannières enregistrées"); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } finally { setBusy(false); } };
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 max-w-3xl space-y-5" data-testid="admin-banners">
      <div>
        <h3 className="font-display font-bold text-lg mb-1">Bannière principale (accueil)</h3>
        <p className="text-sm text-slate-500 mb-3">Image d'arrière-plan et texte de la bannière d'accueil.</p>
        <L label="Image de la bannière"><ImageUpload value={f.hero_image} onChange={(url) => setF({ ...f, hero_image: url })} /></L>
        <div className="mt-3 space-y-3">
          <L label="Titre"><input value={f.hero_title || ""} onChange={(e) => setF({ ...f, hero_title: e.target.value })} className={inp} data-testid="banner-title" /></L>
          <L label="Sous-titre"><textarea rows={2} value={f.hero_subtitle || ""} onChange={(e) => setF({ ...f, hero_subtitle: e.target.value })} className={inp} /></L>
        </div>
      </div>
      <div>
        <h3 className="font-display font-bold text-lg mb-1">Bandeau défilant (haut de page)</h3>
        <p className="text-sm text-slate-500 mb-3">Messages qui défilent en haut du site.</p>
        <div className="space-y-2">
          {(f.top_bar_messages || []).map((m, i) => (
            <div key={i} className="flex gap-2">
              <input value={m} onChange={(e) => setMsg(i, e.target.value)} className={inp} data-testid={`banner-msg-${i}`} />
              <button onClick={() => delMsg(i)} className="text-slate-400 hover:text-red-500 px-2"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <button onClick={addMsg} className="flex items-center gap-1.5 text-mint-700 text-sm font-semibold"><Plus className="w-4 h-4" /> Ajouter un message</button>
        </div>
      </div>
      <button onClick={save} disabled={busy} data-testid="banners-save" className="px-6 py-3 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold disabled:opacity-50">{busy ? "…" : "Enregistrer"}</button>
    </div>
  );
}

function AccountPanel() {
  const { refresh } = useAuth();
  const [f, setF] = useState({ first_name: "", email: "", new_password: "", current_password: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get("/auth/me").then((r) => setF((p) => ({ ...p, first_name: r.data.first_name || "", email: r.data.email || "" }))); }, []);
  const save = async () => {
    if (!f.current_password) { toast.error("Entrez votre mot de passe actuel"); return; }
    setBusy(true);
    try {
      await api.put("/admin/account", { first_name: f.first_name, email: f.email, new_password: f.new_password || undefined, current_password: f.current_password });
      await refresh(); toast.success("Compte mis à jour"); setF({ ...f, new_password: "", current_password: "" });
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 max-w-xl space-y-4" data-testid="admin-account">
      <h3 className="font-display font-bold text-lg">Paramètres du compte administrateur</h3>
      <p className="text-sm text-slate-500">Modifiez votre nom, email et mot de passe. Le mot de passe actuel est requis pour valider.</p>
      <L label="Nom d'utilisateur"><input value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} data-testid="acc-name" className={inp} /></L>
      <L label="Email de connexion"><input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} data-testid="acc-email" className={inp} /></L>
      <L label="Nouveau mot de passe (laisser vide pour ne pas changer)"><PwInput value={f.new_password} onChange={(e) => setF({ ...f, new_password: e.target.value })} testid="acc-new-password" /></L>
      <div className="h-px bg-mint-100" />
      <L label="Mot de passe actuel *"><PwInput value={f.current_password} onChange={(e) => setF({ ...f, current_password: e.target.value })} testid="acc-current-password" /></L>
      <button onClick={save} disabled={busy} data-testid="acc-save" className="px-6 py-3 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold disabled:opacity-50">{busy ? "…" : "Enregistrer les modifications"}</button>
    </div>
  );
}

function BrandForm({ brand, onClose, onSaved }) {
  const [f, setF] = useState(brand);
  const save = async () => {
    if (!f.name) { toast.error("Nom requis"); return; }
    const payload = { name: f.name, logo: f.logo || null, description: f.description || "" };
    try { if (f.id) await api.put(`/brands/${f.id}`, payload); else await api.post("/brands", payload); toast.success("Marque enregistrée"); onSaved(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  return (
    <Modal title={f.id ? "Modifier la marque" : "Nouvelle marque"} onClose={onClose}>
      <L label="Nom"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="bf-name" className={inp} /></L>
      <L label="Description"><textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inp} /></L>
      <L label="Logo"><ImageUpload value={f.logo} onChange={(url) => setF({ ...f, logo: url })} /></L>
      <button onClick={save} data-testid="bf-save" className="w-full py-3 rounded-full bg-mint-600 text-white font-semibold">Enregistrer</button>
    </Modal>
  );
}

function BlogForm({ post, onClose, onSaved }) {
  const [f, setF] = useState(post);
  const save = async () => {
    if (!f.title) { toast.error("Titre requis"); return; }
    const payload = { title: f.title, excerpt: f.excerpt, content: f.content, image: f.image || null, author: f.author || "Équipe Pharma360" };
    try { if (f.id) await api.put(`/blog/${f.id}`, payload); else await api.post("/blog", payload); toast.success("Article enregistré"); onSaved(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  return (
    <Modal title={f.id ? "Modifier l'article" : "Nouvel article"} onClose={onClose}>
      <L label="Titre"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} data-testid="blf-title" className={inp} /></L>
      <L label="Extrait"><textarea rows={2} value={f.excerpt} onChange={(e) => setF({ ...f, excerpt: e.target.value })} className={inp} /></L>
      <L label="Contenu"><textarea rows={5} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} className={inp} /></L>
      <L label="Auteur"><input value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} className={inp} /></L>
      <L label="Image"><ImageUpload value={f.image} onChange={(url) => setF({ ...f, image: url })} /></L>
      <button onClick={save} data-testid="blf-save" className="w-full py-3 rounded-full bg-mint-600 text-white font-semibold">Enregistrer</button>
    </Modal>
  );
}

function DeliveryPanel() {
  const [wilayas, setWilayas] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () => api.get("/delivery/wilayas").then((r) => setWilayas(r.data));
  useEffect(() => { load(); }, []);
  const del = async (w) => {
    if (!confirm(`Supprimer la wilaya « ${w.name} » ?`)) return;
    await api.delete(`/admin/wilayas/${w.id}`); load(); toast.success("Supprimée");
  };
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={() => setEditing({ name: "", code: "", base_fee: 400, cities: [], agencies: [], order: 100 })} data-testid="admin-add-wilaya" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-mint-600 text-white font-semibold text-sm"><Plus className="w-4 h-4" /> Ajouter une wilaya</button>
        <span className="text-sm text-slate-400">{wilayas.length} wilayas · gère les prix par wilaya, commune et agence</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {wilayas.map((w) => (
          <div key={w.id} className="bg-white rounded-2xl border border-slate-200/80 p-4" data-testid={`admin-wilaya-${w.id}`}>
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-mint-600" /> {w.code} — {w.name}</div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(w)} data-testid={`admin-edit-wilaya-${w.id}`} className="text-slate-400 hover:text-mint-700"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => del(w)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-2">Base: <span className="font-semibold text-mint-700">{w.base_fee} DA</span> · {w.cities.length} communes · {w.agencies.length} agences</div>
          </div>
        ))}
      </div>
      {editing && <WilayaEditor w={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function FeeListEditor({ label, items, onChange, tid }) {
  const [name, setName] = useState("");
  const [fee, setFee] = useState("");
  const rowInp = "px-3 py-2 rounded-xl border border-mint-200 text-sm bg-white outline-none focus:ring-2 focus:ring-mint-500";
  const add = () => { if (!name.trim()) return; onChange([...items, { name: name.trim(), fee: Number(fee) || 0 }]); setName(""); setFee(""); };
  const upd = (i, k, v) => onChange(items.map((it, idx) => idx === i ? { ...it, [k]: k === "fee" ? Number(v) || 0 : v } : it));
  const rm = (i) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div>
      <div className="text-sm font-semibold text-slate-dark mb-2">{label} ({items.length})</div>
      <div className="space-y-2 max-h-56 overflow-auto pr-1 mb-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={it.name} onChange={(e) => upd(i, "name", e.target.value)} placeholder="Nom" data-testid={`${tid}-name-${i}`} className={`${rowInp} flex-1 min-w-0`} />
            <input type="number" value={it.fee} onChange={(e) => upd(i, "fee", e.target.value)} placeholder="Prix" data-testid={`${tid}-price-${i}`} className={`${rowInp} w-20 shrink-0`} />
            <button type="button" onClick={() => rm(i)} data-testid={`${tid}-remove-${i}`} className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-slate-400">Aucun élément. Ajoutez-en ci-dessous.</p>}
      </div>
      <div className="flex items-center gap-2 border-t border-mint-100 pt-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouveau nom" data-testid={`${tid}-add-name`} className={`${rowInp} flex-1 min-w-0`} />
        <input type="number" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="Prix" data-testid={`${tid}-add-price`} className={`${rowInp} w-20 shrink-0`} />
        <button type="button" onClick={add} data-testid={`${tid}-add-btn`} className="px-3 py-2 rounded-xl bg-mint-100 text-mint-700 text-sm font-semibold whitespace-nowrap shrink-0"><Plus className="w-4 h-4 inline" /> Ajouter</button>
      </div>
    </div>
  );
}

function WilayaEditor({ w, onClose, onSaved }) {
  const [f, setF] = useState({ ...w });
  const setV = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!f.name) { toast.error("Nom requis"); return; }
    const payload = { name: f.name, code: f.code, base_fee: Number(f.base_fee) || 0, cities: f.cities, agencies: f.agencies, order: Number(f.order) || 100 };
    try {
      if (f.id) await api.put(`/admin/wilayas/${f.id}`, payload); else await api.post("/admin/wilayas", payload);
      toast.success("Wilaya enregistrée"); onSaved();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  return (
    <Modal title={f.id ? `Modifier ${f.name}` : "Nouvelle wilaya"} onClose={onClose} wide>
      <div className="grid grid-cols-3 gap-3">
        <L label="Nom"><input value={f.name} onChange={(e) => setV("name", e.target.value)} data-testid="wilaya-name" className={inp} /></L>
        <L label="Code"><input value={f.code} onChange={(e) => setV("code", e.target.value)} className={inp} /></L>
        <L label="Prix de base (DA)"><input type="number" value={f.base_fee} onChange={(e) => setV("base_fee", e.target.value)} data-testid="wilaya-base-fee" className={inp} /></L>
      </div>
      <div className="grid sm:grid-cols-2 gap-5 mt-3">
        <FeeListEditor label="Communes (livraison domicile)" items={f.cities} onChange={(v) => setV("cities", v)} tid="city" />
        <FeeListEditor label="Agences (point relais)" items={f.agencies} onChange={(v) => setV("agencies", v)} tid="agency" />
      </div>
      <button onClick={save} data-testid="wilaya-save" className="w-full mt-4 py-3 rounded-full bg-mint-600 text-white font-semibold">Enregistrer</button>
    </Modal>
  );
}


function LinksEditor({ title, links, onChange, pageOptions, testidPrefix }) {
  const update = (i, patch) => { const arr = [...links]; arr[i] = { ...arr[i], ...patch }; onChange(arr); };
  const del = (i) => onChange(links.filter((_, x) => x !== i));
  const add = () => onChange([...links, { id: `l${Date.now()}`, label: "Nouveau lien", target: "/page/", enabled: true }]);
  return (
    <div>
      <h4 className="font-semibold text-sm mb-2">{title}</h4>
      <div className="space-y-2">
        {links.map((l, i) => (
          <div key={l.id} className="flex flex-wrap items-center gap-2 bg-mint-50/40 rounded-xl p-2" data-testid={`${testidPrefix}-row-${i}`}>
            <input type="checkbox" checked={l.enabled !== false} onChange={(e) => update(i, { enabled: e.target.checked })} className="accent-mint-600 w-4 h-4" title="Activer/désactiver" data-testid={`${testidPrefix}-enabled-${i}`} />
            <input value={l.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Libellé" className={`${inp} flex-1 min-w-[140px]`} data-testid={`${testidPrefix}-label-${i}`} />
            <input value={l.target} onChange={(e) => update(i, { target: e.target.value })} placeholder="/page/slug ou https://..." list="footer-page-targets" className={`${inp} flex-1 min-w-[160px]`} data-testid={`${testidPrefix}-target-${i}`} />
            <button onClick={() => del(i)} className="text-slate-400 hover:text-red-500 px-1" data-testid={`${testidPrefix}-del-${i}`}><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        <datalist id="footer-page-targets">
          {(pageOptions || []).map((p) => <option key={p.slug} value={`/page/${p.slug}`}>{p.title}</option>)}
          <option value="/confidentialite">Confidentialité</option>
          <option value="/cgv">CGV</option>
          <option value="/catalogue?on_promo=1">Soldes</option>
        </datalist>
        <button onClick={add} className="flex items-center gap-1.5 text-mint-700 text-sm font-semibold" data-testid={`${testidPrefix}-add`}><Plus className="w-4 h-4" /> Ajouter un lien</button>
      </div>
    </div>
  );
}

function PageEditModal({ page, onClose, onSaved }) {
  const [f, setF] = useState(page || { title: "", slug: "", content: "", enabled: true });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.title) { toast.error("Titre requis"); return; }
    setBusy(true);
    try {
      const payload = { title: f.title, slug: f.slug || undefined, content: f.content || "", enabled: f.enabled !== false };
      if (f.id) await api.put(`/admin/pages/${f.id}`, payload);
      else await api.post("/admin/pages", payload);
      toast.success("Page enregistrée"); onSaved();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };
  return (
    <Modal title={f.id ? "Modifier la page" : "Nouvelle page"} onClose={onClose}>
      <L label="Titre"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inp} data-testid="page-title-input" /></L>
      <div className="mt-3"><L label="Slug (URL) — laisser vide pour générer automatiquement"><input value={f.slug || ""} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder="ex: faq" className={inp} data-testid="page-slug-input" /></L></div>
      <div className="mt-3"><L label="Contenu de la page"><textarea rows={10} value={f.content || ""} onChange={(e) => setF({ ...f, content: e.target.value })} className={inp} data-testid="page-content-input" /></L></div>
      <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" checked={f.enabled !== false} onChange={(e) => setF({ ...f, enabled: e.target.checked })} className="accent-mint-600 w-4 h-4" data-testid="page-enabled-input" /> Page visible (activée)</label>
      <button onClick={save} disabled={busy} data-testid="page-save" className="w-full mt-4 py-3 rounded-full bg-mint-600 text-white font-semibold disabled:opacity-50">{busy ? "…" : "Enregistrer"}</button>
    </Modal>
  );
}

function AnalyticsPanel() {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/analytics?period=${period}`).then((r) => setData(r.data)).catch(() => setData(null)).finally(() => setLoading(false));
  }, [period]);

  const periods = [["day", "Aujourd'hui"], ["week", "7 jours"], ["month", "30 jours"], ["all", "Tout"]];

  return (
    <div className="space-y-5" data-testid="analytics-panel">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {periods.map(([id, label]) => (
            <button key={id} onClick={() => setPeriod(id)} data-testid={`analytics-period-${id}`}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${period === id ? "bg-mint-600 text-white" : "bg-white border border-mint-200 text-slate-600"}`}>{label}</button>
          ))}
        </div>
        <p className="text-xs text-slate-400">Basé sur les commandes livrées</p>
      </div>

      {loading || !data ? <p className="text-slate-400 text-center py-12">Chargement…</p> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[[TrendingUp, "CA de la période", formatDA(data.revenue)], [ShoppingBag, "Commandes livrées", data.orders], [BarChart3, "Panier moyen", formatDA(data.aov)], [Users, "Nouveaux clients", data.new_customers]].map(([Icon, label, val], i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-5" data-testid={`analytics-stat-${i}`}>
                <Icon className="w-5 h-5 text-mint-600 mb-3" />
                <div className="font-display font-extrabold text-2xl">{val}</div>
                <div className="text-sm text-slate-500">{label}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden" data-testid="analytics-top-products">
              <div className="px-5 py-4 border-b border-slate-100 font-display font-bold flex items-center gap-2"><Package className="w-4 h-4 text-mint-600" /> Produits les plus vendus</div>
              {data.top_products.length === 0 ? <p className="text-slate-400 text-sm p-5">Aucune vente sur cette période.</p> : (
                <table className="w-full text-sm">
                  <thead className="bg-mint-50 text-slate-500 text-xs uppercase"><tr><th className="text-left p-3">Produit</th><th className="text-right p-3">Qté</th><th className="text-right p-3">CA</th></tr></thead>
                  <tbody>
                    {data.top_products.map((p, i) => (
                      <tr key={i} className="border-t border-mint-50" data-testid={`top-product-${i}`}>
                        <td className="p-3 font-medium line-clamp-1">{p.name}</td>
                        <td className="p-3 text-right font-semibold">{p.qty}</td>
                        <td className="p-3 text-right text-mint-700 font-semibold whitespace-nowrap">{formatDA(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden" data-testid="analytics-top-customers">
              <div className="px-5 py-4 border-b border-slate-100 font-display font-bold flex items-center gap-2"><Users className="w-4 h-4 text-mint-600" /> Clients les plus dépensiers</div>
              {data.top_customers.length === 0 ? <p className="text-slate-400 text-sm p-5">Aucun client sur cette période.</p> : (
                <table className="w-full text-sm">
                  <thead className="bg-mint-50 text-slate-500 text-xs uppercase"><tr><th className="text-left p-3">Client</th><th className="text-right p-3">Cmd</th><th className="text-right p-3">Dépensé</th></tr></thead>
                  <tbody>
                    {data.top_customers.map((c, i) => (
                      <tr key={i} className="border-t border-mint-50" data-testid={`top-customer-${i}`}>
                        <td className="p-3"><div className="font-medium line-clamp-1">{c.name || "—"}</div><div className="text-xs text-slate-400">{c.phone || ""}</div></td>
                        <td className="p-3 text-right font-semibold">{c.orders}</td>
                        <td className="p-3 text-right text-mint-700 font-semibold whitespace-nowrap">{formatDA(c.spent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400">Une commande erronée fausse ces chiffres ? Supprimez-la dans l'onglet « Commandes » pour la retirer du calcul.</p>
        </>
      )}
    </div>
  );
}

function ChatAdminPanel() {
  const { settings } = useSettings();
  const [convs, setConvs] = useState([]);
  const [sel, setSel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const loadConvs = () => api.get("/admin/chat/conversations").then((r) => setConvs(r.data)).catch(() => {});
  const loadMsgs = (id) => api.get(`/admin/chat/${id}/messages`).then((r) => setMessages(r.data)).catch(() => {});

  useEffect(() => { loadConvs(); const t = setInterval(loadConvs, 6000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (sel) { loadMsgs(sel.id); pollRef.current = setInterval(() => loadMsgs(sel.id), 4000); return () => clearInterval(pollRef.current); }
  }, [sel]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const reply = async () => {
    const t = text.trim(); if (!t || !sel) return;
    setText("");
    try { await api.post(`/admin/chat/${sel.id}/reply`, { text: t }); await loadMsgs(sel.id); loadConvs(); } catch {}
  };

  const sendQuick = async (t) => {
    if (!t || !sel) return;
    try { await api.post(`/admin/chat/${sel.id}/reply`, { text: t }); await loadMsgs(sel.id); loadConvs(); } catch {}
  };
  const quickReplies = (settings.chat_quick_replies || []).filter(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden grid md:grid-cols-3 h-[600px]" data-testid="admin-chat-panel">
      <div className="border-r border-slate-100 overflow-auto" data-testid="chat-conv-list">
        {convs.length === 0 && <p className="text-slate-400 text-sm p-4">Aucune conversation.</p>}
        {convs.map((c) => (
          <button key={c.id} onClick={() => setSel(c)} data-testid={`chat-conv-${c.id}`}
            className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-mint-50/50 ${sel?.id === c.id ? "bg-mint-50" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm truncate">{c.name || "Visiteur"}</span>
              {c.unread_admin > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] grid place-items-center shrink-0">{c.unread_admin}</span>}
            </div>
            <div className="text-xs text-slate-400 truncate">{c.email || "—"}</div>
            <div className="text-[11px] text-slate-400">{new Date(c.last_message_at).toLocaleString("fr-FR")}</div>
          </button>
        ))}
      </div>
      <div className="md:col-span-2 flex flex-col">
        {!sel ? (
          <div className="flex-1 grid place-items-center text-slate-400 text-sm">Sélectionnez une conversation</div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-slate-100"><div className="font-semibold text-sm">{sel.name}</div><div className="text-xs text-slate-400">{sel.email || "—"}</div></div>
            <div className="flex-1 overflow-auto p-4 space-y-3 bg-mint-50/20" data-testid="chat-admin-messages">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${m.sender === "admin" ? "bg-mint-600 text-white rounded-br-sm" : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"}`}>{m.text}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="p-3 border-t border-slate-100">
              {quickReplies.length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-1" data-testid="chat-quick-replies">
                  {quickReplies.map((q, i) => (
                    <button key={i} onClick={() => sendQuick(q)} data-testid={`chat-quick-reply-${i}`} title={q}
                      className="shrink-0 px-3 py-1.5 rounded-full bg-mint-50 border border-mint-200 text-mint-700 text-xs font-medium hover:bg-mint-100 hover:border-mint-400 max-w-[220px] truncate">
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && reply()} placeholder="Votre réponse…" data-testid="chat-admin-input" className={`${inp} rounded-full`} />
                <button onClick={reply} data-testid="chat-admin-send" className="w-10 h-10 rounded-full bg-mint-600 text-white grid place-items-center shrink-0"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GiftPackModal({ pack, onClose, onSaved }) {
  const [f, setF] = useState(pack || { name: "", description: "", image: null, product_ids: [], price: 0, enabled: true });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.name) { toast.error("Nom requis"); return; }
    setBusy(true);
    try {
      const payload = { name: f.name, description: f.description || "", image: f.image || null, product_ids: f.product_ids || [], price: Number(f.price) || 0, enabled: f.enabled !== false };
      if (f.id) await api.put(`/admin/gift-packs/${f.id}`, payload);
      else await api.post("/admin/gift-packs", payload);
      toast.success("Coffret enregistré"); onSaved();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };
  return (
    <Modal title={f.id ? "Modifier le coffret" : "Nouveau coffret cadeau"} onClose={onClose}>
      <L label="Nom du coffret"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inp} data-testid="pack-name" /></L>
      <div className="mt-3"><L label="Description"><textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inp} data-testid="pack-desc" /></L></div>
      <div className="mt-3"><L label="Image du coffret"><ImageUpload value={f.image} onChange={(url) => setF({ ...f, image: url })} /></L></div>
      <div className="mt-3"><L label="Produits inclus"><BulkProductSelector value={f.product_ids} onChange={(ids) => setF({ ...f, product_ids: ids })} testid="pack-products" /></L></div>
      <div className="mt-3"><L label="Prix du coffret (DA)"><input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className={inp} data-testid="pack-price" /></L></div>
      <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" checked={f.enabled !== false} onChange={(e) => setF({ ...f, enabled: e.target.checked })} className="accent-mint-600 w-4 h-4" /> Visible sur le site</label>
      <button onClick={save} disabled={busy} data-testid="pack-save" className="w-full mt-4 py-3 rounded-full bg-mint-600 text-white font-semibold disabled:opacity-50">{busy ? "…" : "Enregistrer"}</button>
    </Modal>
  );
}

function GiftAdminPanel() {
  const { refresh } = useSettings();
  const [f, setF] = useState(null);
  const [packs, setPacks] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const loadPacks = () => api.get("/admin/gift-packs").then((r) => setPacks(r.data)).catch(() => {});
  const [ecards, setEcards] = useState([]);
  useEffect(() => { api.get("/settings").then((r) => setF(r.data)); loadPacks(); api.get("/admin/giftcards").then((r) => setEcards(r.data)).catch(() => {}); }, []);
  if (!f) return <p className="text-slate-400">Chargement…</p>;

  const amounts = f.giftcard_amounts || [];
  const setAmt = (i, v) => { const a = [...amounts]; a[i] = Number(v) || 0; setF({ ...f, giftcard_amounts: a }); };
  const addAmt = () => setF({ ...f, giftcard_amounts: [...amounts, 1000] });
  const delAmt = (i) => setF({ ...f, giftcard_amounts: amounts.filter((_, x) => x !== i) });

  const save = async () => {
    setBusy(true);
    try {
      await api.put("/settings", {
        gift_intro: f.gift_intro, gift_featured_ids: f.gift_featured_ids || [],
        giftcard_enabled: f.giftcard_enabled, giftcard_amounts: amounts.map(Number).filter((n) => n > 0),
        giftcard_design: f.giftcard_design || null, giftcard_terms: f.giftcard_terms,
      });
      await refresh(); toast.success("Enregistré");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };
  const delPack = async (id) => { if (!window.confirm("Supprimer ce coffret ?")) return; await api.delete(`/admin/gift-packs/${id}`); loadPacks(); };

  return (
    <div className="space-y-6" data-testid="admin-gifts-panel">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 max-w-3xl space-y-5">
        <div>
          <h3 className="font-display font-bold text-lg mb-1">Idées cadeaux</h3>
          <L label="Texte d'introduction"><textarea rows={2} value={f.gift_intro || ""} onChange={(e) => setF({ ...f, gift_intro: e.target.value })} className={inp} data-testid="gift-intro-input" /></L>
          <div className="mt-3"><L label="Produits mis en avant"><BulkProductSelector value={f.gift_featured_ids} onChange={(ids) => setF({ ...f, gift_featured_ids: ids })} testid="gift-featured" /></L></div>
        </div>
        <div className="border-t border-mint-100 pt-4">
          <h3 className="font-display font-bold text-lg mb-1">Carte cadeau</h3>
          <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={f.giftcard_enabled !== false} onChange={(e) => setF({ ...f, giftcard_enabled: e.target.checked })} className="accent-mint-600 w-4 h-4" data-testid="giftcard-enabled" /> Activer la carte cadeau</label>
          <L label="Design de la carte (image)"><ImageUpload value={f.giftcard_design} onChange={(url) => setF({ ...f, giftcard_design: url })} /></L>
          <div className="mt-3">
            <div className="text-xs font-medium text-slate-500 mb-1">Montants disponibles (DA)</div>
            <div className="flex flex-wrap gap-2">
              {amounts.map((a, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input type="number" value={a} onChange={(e) => setAmt(i, e.target.value)} className={`${inp} w-28`} data-testid={`giftcard-amount-${i}`} />
                  <button onClick={() => delAmt(i)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              <button onClick={addAmt} className="flex items-center gap-1.5 text-mint-700 text-sm font-semibold px-2"><Plus className="w-4 h-4" /> Montant</button>
            </div>
          </div>
          <div className="mt-3"><L label="Modalités / description"><textarea rows={3} value={f.giftcard_terms || ""} onChange={(e) => setF({ ...f, giftcard_terms: e.target.value })} className={inp} data-testid="giftcard-terms-input" /></L></div>
        </div>
        <button onClick={save} disabled={busy} data-testid="gifts-save" className="px-6 py-3 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold disabled:opacity-50">{busy ? "…" : "Enregistrer"}</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <div><h3 className="font-display font-bold text-lg">Coffrets cadeaux (packs)</h3><p className="text-sm text-slate-500">Regroupez plusieurs produits en un coffret à prix unique.</p></div>
          <button onClick={() => setEditing({})} data-testid="pack-new" className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-mint-600 text-white text-sm font-semibold"><Plus className="w-4 h-4" /> Nouveau coffret</button>
        </div>
        <div className="space-y-2" data-testid="packs-list">
          {packs.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-mint-50/40 rounded-xl p-3" data-testid={`pack-row-${p.id}`}>
              <div className="w-12 h-12 rounded-lg bg-white overflow-hidden shrink-0 grid place-items-center">{p.image ? <img src={mediaUrl(p.image)} alt="" className="w-full h-full object-cover" /> : <Gift className="w-5 h-5 text-mint-300" />}</div>
              <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{p.name} {p.enabled === false && <span className="text-xs text-red-500 font-normal">(masqué)</span>}</div><div className="text-xs text-slate-400">{formatDA(p.price)} · {(p.product_ids || []).length} produits</div></div>
              <button onClick={() => setEditing(p)} className="text-slate-400 hover:text-mint-600" data-testid={`pack-edit-${p.id}`}><Pencil className="w-4 h-4" /></button>
              <button onClick={() => delPack(p.id)} className="text-slate-400 hover:text-red-500" data-testid={`pack-del-${p.id}`}><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {packs.length === 0 && <p className="text-slate-400 text-sm">Aucun coffret.</p>}
        </div>
      </div>

      {editing !== null && <GiftPackModal pack={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); loadPacks(); }} />}

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 max-w-3xl">
        <h3 className="font-display font-bold text-lg mb-3">E-cartes cadeaux émises</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[620px]" data-testid="admin-ecards-table">
            <thead className="bg-mint-50 text-slate-500 text-xs uppercase"><tr><th className="text-left p-2">Code</th><th className="text-left p-2">Montant</th><th className="text-left p-2">Solde</th><th className="text-left p-2">Envoi</th><th className="text-left p-2">Date</th><th className="text-left p-2">Statut</th></tr></thead>
            <tbody>
              {ecards.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-400">Aucune e-carte.</td></tr>}
              {ecards.map((c) => (
                <tr key={c.id} className="border-t border-mint-50" data-testid={`admin-ecard-${c.id}`}>
                  <td className="p-2 font-mono text-xs">{c.code}</td>
                  <td className="p-2">{formatDA(c.amount)}</td>
                  <td className="p-2 font-semibold text-mint-700">{formatDA(c.balance)}</td>
                  <td className="p-2">{c.delivery === "email" ? `Email (${c.recipient_email || "—"})` : "Impression"}</td>
                  <td className="p-2 text-slate-500">{c.scheduled_date || "—"}</td>
                  <td className="p-2"><span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs">{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GiftProductAdd({ onAdd }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  useEffect(() => {
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(() => { api.get(`/products?search=${encodeURIComponent(q)}&limit=8`).then((r) => setResults(r.data)).catch(() => {}); }, 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="relative">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un produit du catalogue à offrir…" className={inp} data-testid="gift-product-search" />
      {results.length > 0 && (
        <div className="absolute z-10 left-0 right-0 mt-1 bg-white rounded-xl border border-mint-100 shadow-lg max-h-52 overflow-auto">
          {results.map((p) => (
            <button type="button" key={p.id} onClick={() => { onAdd(p); setQ(""); setResults([]); }} data-testid={`gift-product-result-${p.id}`} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-mint-50">
              <img src={mediaUrl(p.images?.[0])} alt="" className="w-8 h-8 rounded-lg object-cover bg-mint-50" /> <span className="flex-1 line-clamp-1">{p.name}</span> <span className="text-mint-700 font-semibold">{formatDA(p.price)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LoyaltyAdminPanel() {
  const { refresh } = useSettings();
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get("/settings").then((r) => setF(r.data)); }, []);
  if (!f) return <p className="text-slate-400">Chargement…</p>;

  const tiers = f.loyalty_tiers || [];
  const rewards = f.loyalty_rewards || [];
  const offers = f.loyalty_offers || [];
  const setTier = (i, patch) => { const a = [...tiers]; a[i] = { ...a[i], ...patch }; setF({ ...f, loyalty_tiers: a }); };
  const addTier = () => setF({ ...f, loyalty_tiers: [...tiers, { name: "Nouveau", min: 0, gifts: [] }] });
  const delTier = (i) => setF({ ...f, loyalty_tiers: tiers.filter((_, x) => x !== i) });
  const setRw = (i, patch) => { const a = [...rewards]; a[i] = { ...a[i], ...patch }; setF({ ...f, loyalty_rewards: a }); };
  const addRw = () => setF({ ...f, loyalty_rewards: [...rewards, { id: `r${Date.now()}`, label: "Nouvelle récompense", points: 500, type: "fixed", value: 500, enabled: true }] });
  const delRw = (i) => setF({ ...f, loyalty_rewards: rewards.filter((_, x) => x !== i) });
  // gifts per tier
  const addProductGift = (i, p) => setTier(i, { gifts: [...(tiers[i].gifts || []), { id: `g${Date.now()}`, type: "product", product_id: p.id, name: p.name, image: p.images?.[0] || null }] });
  const setProductGiftIds = (i, ids) => {
    const existing = tiers[i].gifts || [];
    const custom = existing.filter((g) => g.type !== "product");
    const prevProd = existing.filter((g) => g.type === "product");
    const prod = ids.map((id) => prevProd.find((g) => g.product_id === id) || { id: `g${Date.now()}_${id.slice(-5)}`, type: "product", product_id: id });
    setTier(i, { gifts: [...custom, ...prod] });
  };
  const addCustomGift = (i) => setTier(i, { gifts: [...(tiers[i].gifts || []), { id: `g${Date.now()}`, type: "custom", name: "", image: null }] });
  const setGift = (i, j, patch) => { const g = [...(tiers[i].gifts || [])]; g[j] = { ...g[j], ...patch }; setTier(i, { gifts: g }); };
  const delGift = (i, j) => setTier(i, { gifts: (tiers[i].gifts || []).filter((_, x) => x !== j) });
  // exclusive offers
  const setOffer = (i, patch) => { const a = [...offers]; a[i] = { ...a[i], ...patch }; setF({ ...f, loyalty_offers: a }); };
  const addOffer = () => setF({ ...f, loyalty_offers: [...offers, { id: `o${Date.now()}`, title: "Nouvelle offre", discount_type: "percent", discount_value: 10, product_ids: [], tiers: [], enabled: true }] });
  const delOffer = (i) => setF({ ...f, loyalty_offers: offers.filter((_, x) => x !== i) });

  const save = async () => {
    setBusy(true);
    try {
      await api.put("/settings", {
        loyalty_enabled: f.loyalty_enabled, loyalty_points_per_100da: Number(f.loyalty_points_per_100da) || 1,
        loyalty_tiers: tiers.map((t) => ({ name: t.name, min: Number(t.min) || 0, perks: (t.perks || []).filter((p) => p && p.trim()), gifts: (t.gifts || []).filter((g) => (g.type === "product" && g.product_id) || (g.name && g.name.trim())) })),
        loyalty_rewards: rewards.map((r) => ({ ...r, points: Number(r.points) || 0, value: Number(r.value) || 0 })),
        loyalty_offers: offers.map((o) => ({ id: o.id, title: o.title, discount_type: o.discount_type, discount_value: Number(o.discount_value) || 0, product_ids: o.product_ids || [], tiers: o.tiers || [], enabled: o.enabled !== false })),
        referral_enabled: f.referral_enabled,
        referral_referrer_points: Number(f.referral_referrer_points) || 0,
        referral_referee_points: Number(f.referral_referee_points) || 0,
      });
      await refresh(); toast.success("Programme de fidélité enregistré");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 max-w-3xl space-y-6" data-testid="admin-loyalty-panel">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-lg">Programme de fidélité</h3>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.loyalty_enabled !== false} onChange={(e) => setF({ ...f, loyalty_enabled: e.target.checked })} className="accent-mint-600 w-4 h-4" data-testid="loyalty-enabled" /> Activé</label>
      </div>
      <L label="Points gagnés par tranche de 100 DA">
        <input type="number" min="0" value={f.loyalty_points_per_100da ?? 1} onChange={(e) => setF({ ...f, loyalty_points_per_100da: e.target.value })} className={inp} data-testid="loyalty-rate" />
      </L>

      <div className="border-t border-mint-100 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm">Parrainage</h4>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.referral_enabled !== false} onChange={(e) => setF({ ...f, referral_enabled: e.target.checked })} className="accent-mint-600 w-4 h-4" data-testid="referral-enabled" /> Activé</label>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <L label="Points offerts au parrain"><input type="number" min="0" value={f.referral_referrer_points ?? 200} onChange={(e) => setF({ ...f, referral_referrer_points: e.target.value })} className={inp} data-testid="referral-referrer-points" /></L>
          <L label="Points de bienvenue au filleul"><input type="number" min="0" value={f.referral_referee_points ?? 100} onChange={(e) => setF({ ...f, referral_referee_points: e.target.value })} className={inp} data-testid="referral-referee-points" /></L>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-sm mb-2">Statuts (paliers) & avantages</h4>
        <div className="space-y-4">
          {tiers.map((t, i) => (
            <div key={i} className="border border-mint-100 rounded-xl p-3" data-testid={`tier-row-${i}`}>
              <div className="flex items-center gap-2 mb-2">
                <input value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} placeholder="Nom" className={`${inp} flex-1`} data-testid={`tier-name-${i}`} />
                <input type="number" value={t.min} onChange={(e) => setTier(i, { min: e.target.value })} placeholder="Points min" className={`${inp} w-32`} data-testid={`tier-min-${i}`} />
                <button onClick={() => delTier(i)} className="text-slate-400 hover:text-red-500 px-1"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="pl-1">
                <div className="text-xs font-medium text-slate-500 mb-1">Avantages</div>
                <div className="space-y-1.5">
                  {(t.perks || []).map((p, j) => (
                    <div key={j} className="flex items-center gap-2" data-testid={`tier-${i}-perk-${j}`}>
                      <input value={p} onChange={(e) => { const perks = [...(t.perks || [])]; perks[j] = e.target.value; setTier(i, { perks }); }} className={`${inp} flex-1`} data-testid={`tier-${i}-perk-input-${j}`} />
                      <button onClick={() => setTier(i, { perks: (t.perks || []).filter((_, x) => x !== j) })} className="text-slate-400 hover:text-red-500" data-testid={`tier-${i}-perk-del-${j}`}><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button onClick={() => setTier(i, { perks: [...(t.perks || []), "Nouvel avantage"] })} data-testid={`tier-${i}-perk-add`} className="flex items-center gap-1.5 text-mint-700 text-xs font-semibold"><Plus className="w-3.5 h-3.5" /> Ajouter un avantage</button>
                </div>
                <div className="mt-3 pt-3 border-t border-mint-50">
                  <div className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5"><Gift className="w-3.5 h-3.5 text-mint-600" /> Cadeaux offerts pour ce statut</div>
                  <div className="text-[11px] font-semibold text-slate-400 mb-1">Produits du catalogue</div>
                  <BulkProductSelector value={(t.gifts || []).filter((g) => g.type === "product").map((g) => g.product_id)} onChange={(ids) => setProductGiftIds(i, ids)} testid={`tier-${i}-giftpick`} />
                  <div className="text-[11px] font-semibold text-slate-400 mt-3 mb-1">Cadeaux exclusifs (hors catalogue)</div>
                  <div className="space-y-2 mb-2">
                    {(t.gifts || []).map((g, j) => g.type === "product" ? null : (
                      <div key={g.id || j} className="flex items-center gap-2 bg-mint-50/40 rounded-xl p-2" data-testid={`tier-${i}-gift-${j}`}>
                        <div className="shrink-0"><ImageUpload value={g.image} onChange={(url) => setGift(i, j, { image: url })} /></div>
                        <input value={g.name} onChange={(e) => setGift(i, j, { name: e.target.value })} placeholder="Nom du cadeau exclusif" className={`${inp} flex-1`} data-testid={`tier-${i}-gift-name-${j}`} />
                        <button onClick={() => delGift(i, j)} className="text-slate-400 hover:text-red-500 shrink-0" data-testid={`tier-${i}-gift-del-${j}`}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addCustomGift(i)} data-testid={`tier-${i}-gift-add-custom`} className="flex items-center gap-1.5 text-mint-700 text-xs font-semibold"><Plus className="w-3.5 h-3.5" /> Ajouter un cadeau exclusif (hors catalogue)</button>
                </div>
              </div>
            </div>
          ))}
          <button onClick={addTier} className="flex items-center gap-1.5 text-mint-700 text-sm font-semibold" data-testid="tier-add"><Plus className="w-4 h-4" /> Ajouter un statut</button>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-sm mb-2">Récompenses</h4>
        <div className="space-y-2">
          {rewards.map((r, i) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 bg-mint-50/40 rounded-xl p-2" data-testid={`reward-row-${i}`}>
              <input type="checkbox" checked={r.enabled !== false} onChange={(e) => setRw(i, { enabled: e.target.checked })} className="accent-mint-600 w-4 h-4" title="Activer" />
              <input value={r.label} onChange={(e) => setRw(i, { label: e.target.value })} placeholder="Libellé" className={`${inp} flex-1 min-w-[140px]`} data-testid={`reward-label-${i}`} />
              <input type="number" value={r.points} onChange={(e) => setRw(i, { points: e.target.value })} placeholder="Coût (pts)" className={`${inp} w-28`} data-testid={`reward-points-${i}`} />
              <select value={r.type} onChange={(e) => setRw(i, { type: e.target.value })} className={`${inp} w-32`} data-testid={`reward-type-${i}`}>
                <option value="fixed">Bon (DA)</option>
                <option value="percent">Réduction (%)</option>
              </select>
              <input type="number" value={r.value} onChange={(e) => setRw(i, { value: e.target.value })} placeholder="Valeur" className={`${inp} w-24`} data-testid={`reward-value-${i}`} />
              <button onClick={() => delRw(i)} className="text-slate-400 hover:text-red-500 px-1"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <button onClick={addRw} className="flex items-center gap-1.5 text-mint-700 text-sm font-semibold" data-testid="reward-add"><Plus className="w-4 h-4" /> Ajouter une récompense</button>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><Ticket className="w-4 h-4 text-mint-600" /> Offres exclusives par statut</h4>
        <p className="text-xs text-slate-500 mb-3">Réductions sur des produits, visibles et applicables uniquement par les membres des statuts sélectionnés.</p>
        <div className="space-y-3">
          {offers.map((o, i) => (
            <div key={o.id} className="border border-mint-100 rounded-xl p-3 space-y-2" data-testid={`offer-row-${i}`}>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={o.enabled !== false} onChange={(e) => setOffer(i, { enabled: e.target.checked })} className="accent-mint-600 w-4 h-4" title="Activer" data-testid={`offer-enabled-${i}`} />
                <input value={o.title} onChange={(e) => setOffer(i, { title: e.target.value })} placeholder="Titre de l'offre" className={`${inp} flex-1`} data-testid={`offer-title-${i}`} />
                <button onClick={() => delOffer(i)} className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={o.discount_type} onChange={(e) => setOffer(i, { discount_type: e.target.value })} className={`${inp} w-40`} data-testid={`offer-type-${i}`}>
                  <option value="percent">Réduction (%)</option>
                  <option value="fixed">Réduction (DA)</option>
                </select>
                <input type="number" min="0" value={o.discount_value} onChange={(e) => setOffer(i, { discount_value: e.target.value })} placeholder="Valeur" className={`${inp} w-28`} data-testid={`offer-value-${i}`} />
                <div className="flex items-center gap-2 ml-auto">
                  {tiers.map((t) => (
                    <label key={t.name} className="flex items-center gap-1 text-xs font-medium">
                      <input type="checkbox" checked={(o.tiers || []).includes(t.name)} onChange={(e) => { const set = new Set(o.tiers || []); e.target.checked ? set.add(t.name) : set.delete(t.name); setOffer(i, { tiers: [...set] }); }} className="accent-mint-600 w-4 h-4" data-testid={`offer-${i}-tier-${t.name}`} />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500 mb-1">Produits concernés</div>
                <BulkProductSelector value={o.product_ids} onChange={(ids) => setOffer(i, { product_ids: ids })} testid={`offer-products-${i}`} />
              </div>
            </div>
          ))}
          <button onClick={addOffer} className="flex items-center gap-1.5 text-mint-700 text-sm font-semibold" data-testid="offer-add"><Plus className="w-4 h-4" /> Ajouter une offre exclusive</button>
        </div>
      </div>

      <button onClick={save} disabled={busy} data-testid="loyalty-save" className="px-6 py-3 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold disabled:opacity-50">{busy ? "…" : "Enregistrer"}</button>
    </div>
  );
}

function FooterPanel() {
  const { refresh } = useSettings();
  const [f, setF] = useState(null);
  const [pages, setPages] = useState([]);
  const [editingPage, setEditingPage] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadPages = () => api.get("/admin/pages").then((r) => setPages(r.data)).catch(() => {});
  useEffect(() => { api.get("/settings").then((r) => setF(r.data)); loadPages(); }, []);
  if (!f) return <p className="text-slate-400">Chargement…</p>;

  const save = async () => {
    setBusy(true);
    try {
      await api.put("/settings", {
        footer_about: f.footer_about, whatsapp_url: f.whatsapp_url,
        footer_news_links: f.footer_news_links || [], footer_help_links: f.footer_help_links || [],
      });
      await refresh(); toast.success("Footer enregistré");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  const delPage = async (id) => { if (!window.confirm("Supprimer cette page ?")) return; await api.delete(`/admin/pages/${id}`); loadPages(); };

  return (
    <div className="space-y-6" data-testid="admin-footer-panel">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 max-w-3xl space-y-5">
        <div>
          <h3 className="font-display font-bold text-lg mb-1">Colonne « À propos »</h3>
          <L label="Texte de présentation de la pharmacie"><textarea rows={4} value={f.footer_about || ""} onChange={(e) => setF({ ...f, footer_about: e.target.value })} className={inp} data-testid="footer-about-input" /></L>
        </div>
        <div>
          <h3 className="font-display font-bold text-lg mb-1">Réseau « Nous suivre »</h3>
          <p className="text-sm text-slate-500 mb-2">Facebook, Instagram et TikTok se règlent dans l'onglet Paramètres. WhatsApp utilise le numéro BaridiMob par défaut, ou saisissez un lien dédié :</p>
          <L label="Lien WhatsApp (optionnel)"><input value={f.whatsapp_url || ""} onChange={(e) => setF({ ...f, whatsapp_url: e.target.value })} placeholder="https://wa.me/213..." className={inp} data-testid="footer-whatsapp-input" /></L>
        </div>
        <LinksEditor title="Colonne « Actualités »" links={f.footer_news_links || []} onChange={(arr) => setF({ ...f, footer_news_links: arr })} pageOptions={pages} testidPrefix="news" />
        <LinksEditor title="Colonne « Aide »" links={f.footer_help_links || []} onChange={(arr) => setF({ ...f, footer_help_links: arr })} pageOptions={pages} testidPrefix="help" />
        <button onClick={save} disabled={busy} data-testid="footer-save" className="px-6 py-3 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold disabled:opacity-50">{busy ? "…" : "Enregistrer le footer"}</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <div><h3 className="font-display font-bold text-lg">Pages de contenu (CMS)</h3><p className="text-sm text-slate-500">Éditez le contenu de chaque page liée dans le footer (FAQ, Livraison, etc.).</p></div>
          <button onClick={() => setEditingPage({})} data-testid="page-new" className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-mint-600 text-white text-sm font-semibold"><Plus className="w-4 h-4" /> Nouvelle page</button>
        </div>
        <div className="space-y-2" data-testid="pages-list">
          {pages.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-mint-50/40 rounded-xl p-3" data-testid={`page-row-${p.slug}`}>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{p.title} {p.enabled === false && <span className="text-xs text-red-500 font-normal">(désactivée)</span>}</div>
                <div className="text-xs text-slate-400">/page/{p.slug}</div>
              </div>
              <a href={`/page/${p.slug}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-mint-600" title="Voir"><ExternalLink className="w-4 h-4" /></a>
              <button onClick={() => setEditingPage(p)} className="text-slate-400 hover:text-mint-600" data-testid={`page-edit-${p.slug}`}><Pencil className="w-4 h-4" /></button>
              <button onClick={() => delPage(p.id)} className="text-slate-400 hover:text-red-500" data-testid={`page-del-${p.slug}`}><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {pages.length === 0 && <p className="text-slate-400 text-sm">Aucune page.</p>}
        </div>
      </div>

      {editingPage !== null && <PageEditModal page={editingPage.id ? editingPage : null} onClose={() => setEditingPage(null)} onSaved={() => { setEditingPage(null); loadPages(); }} />}
    </div>
  );
}

function SettingsPanel() {
  const { refresh } = useSettings();
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get("/settings").then((r) => setF(r.data)); }, []);
  if (!f) return <p className="text-slate-400">Chargement…</p>;
  const set = (k, v) => setF({ ...f, [k]: v });
  const setFee = (w, v) => setF({ ...f, delivery_fees: { ...(f.delivery_fees || {}), [w]: Number(v) } });
  const save = async () => {
    setBusy(true);
    try { await api.put("/settings", f); await refresh(); toast.success("Paramètres enregistrés"); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 max-w-3xl space-y-5" data-testid="admin-settings">
      <div>
        <h3 className="font-display font-bold text-lg mb-1">Identité & Logo</h3>
        <L label="Logo (image)"><ImageUpload value={f.logo} onChange={(url) => set("logo", url)} /></L>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <L label="Nom de la boutique"><input value={f.brand_name} onChange={(e) => set("brand_name", e.target.value)} data-testid="set-brand" className={inp} /></L>
          <L label="Slogan"><input value={f.tagline} onChange={(e) => set("tagline", e.target.value)} className={inp} /></L>
        </div>
      </div>
      <div>
        <h3 className="font-display font-bold text-lg mb-3">Coordonnées</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <L label="Téléphone (affiché)"><input value={f.phone} onChange={(e) => set("phone", e.target.value)} data-testid="set-phone" className={inp} /></L>
          <L label="Téléphone (lien tel:)"><input value={f.phone_link} onChange={(e) => set("phone_link", e.target.value)} placeholder="+213..." className={inp} /></L>
          <L label="Email"><input value={f.email} onChange={(e) => set("email", e.target.value)} className={inp} /></L>
          <L label="Email expéditeur (Resend)"><input value={f.sender_email || ""} onChange={(e) => set("sender_email", e.target.value)} placeholder="commandes@votredomaine.com" data-testid="set-sender" className={inp} /></L>
          <L label="Horaires"><input value={f.horaires} onChange={(e) => set("horaires", e.target.value)} className={inp} /></L>
          <L label="WhatsApp (BaridiMob)"><input value={f.whatsapp_number || ""} onChange={(e) => set("whatsapp_number", e.target.value)} placeholder="+213..." data-testid="set-whatsapp" className={inp} /></L>
          <div className="sm:col-span-2"><L label="Adresse"><input value={f.address} onChange={(e) => set("address", e.target.value)} data-testid="set-address" className={inp} /></L></div>
          <div className="sm:col-span-2"><L label="Lien Google Maps (optionnel — sinon généré depuis l'adresse)"><input value={f.maps_link || ""} onChange={(e) => set("maps_link", e.target.value)} placeholder="https://maps.google.com/..." data-testid="set-maps" className={inp} /></L></div>
          <div className="sm:col-span-2"><L label="Lien Visite virtuelle 360°"><input value={f.virtual_tour_url || ""} onChange={(e) => set("virtual_tour_url", e.target.value)} placeholder="https://... (lien d'intégration de la visite 360°)" data-testid="set-virtual-tour" className={inp} /></L></div>
        </div>
      </div>
      <div>
        <h3 className="font-display font-bold text-lg mb-3">Réseaux sociaux</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <L label="Facebook (URL)"><input value={f.facebook} onChange={(e) => set("facebook", e.target.value)} className={inp} /></L>
          <L label="Instagram (URL)"><input value={f.instagram} onChange={(e) => set("instagram", e.target.value)} className={inp} /></L>
          <L label="TikTok (URL)"><input value={f.tiktok} onChange={(e) => set("tiktok", e.target.value)} className={inp} /></L>
        </div>
      </div>
      <div>
        <h3 className="font-display font-bold text-lg mb-3">Livraison & Paiement</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <L label="Frais par défaut (DA)"><input type="number" value={f.delivery_fee} onChange={(e) => set("delivery_fee", Number(e.target.value))} data-testid="set-delivery" className={inp} /></L>
          <L label="Frais point relais (DA)"><input type="number" value={f.relais_fee} onChange={(e) => set("relais_fee", Number(e.target.value))} className={inp} /></L>
          <L label="Zone"><input value={f.delivery_zone} onChange={(e) => set("delivery_zone", e.target.value)} className={inp} /></L>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-3">
          <L label="Seuil d'alerte stock bas"><input type="number" min="0" value={f.low_stock_threshold ?? 5} onChange={(e) => set("low_stock_threshold", Number(e.target.value))} data-testid="set-low-stock-threshold" className={inp} /></L>
        </div>
        <div className="flex flex-wrap gap-5 mt-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.pickup_enabled} onChange={(e) => set("pickup_enabled", e.target.checked)} className="accent-mint-600 w-4 h-4" /> Retrait pharmacie</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.payment_cod_enabled} onChange={(e) => set("payment_cod_enabled", e.target.checked)} className="accent-mint-600 w-4 h-4" data-testid="set-cod" /> Espèces à la livraison</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.payment_baridimob_enabled} onChange={(e) => set("payment_baridimob_enabled", e.target.checked)} className="accent-mint-600 w-4 h-4" data-testid="set-baridimob" /> BaridiMob (WhatsApp)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.payment_card_enabled} onChange={(e) => set("payment_card_enabled", e.target.checked)} className="accent-mint-600 w-4 h-4" data-testid="set-card" /> Paiement carte (démo)</label>
        </div>
        <details className="mt-4">
          <summary className="text-sm font-semibold text-mint-700 cursor-pointer">Frais de livraison par wilaya (optionnel)</summary>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3 max-h-72 overflow-auto pr-1">
            {WILAYAS.map((w) => (
              <div key={w} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-28 truncate">{w}</span>
                <input type="number" placeholder={String(f.delivery_fee)} value={(f.delivery_fees && f.delivery_fees[w]) || ""} onChange={(e) => setFee(w, e.target.value)} className="flex-1 px-2 py-1 rounded-lg border border-mint-200 text-sm" />
              </div>
            ))}
          </div>
        </details>
      </div>
      <div>
        <h3 className="font-display font-bold text-lg mb-1">Apparence & Thèmes</h3>
        <p className="text-sm text-slate-500 mb-3">Change la palette de couleurs du site. Les combinaisons ci-dessous sont modifiables.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <L label="Mode">
            <select value={f.theme_mode || "auto"} onChange={(e) => set("theme_mode", e.target.value)} className={inp} data-testid="theme-mode">
              <option value="auto">Automatique (selon la saison en cours)</option>
              <option value="manual">Manuel (choix fixe)</option>
            </select>
          </L>
          <L label="Thème actif (mode manuel)">
            <select value={f.theme_manual || "spring"} onChange={(e) => set("theme_manual", e.target.value)} disabled={(f.theme_mode || "auto") !== "manual"} className={`${inp} disabled:opacity-50`} data-testid="theme-manual">
              <optgroup label="Saisons">
                <option value="spring">Printemps (vert)</option>
                <option value="summer">Été (turquoise)</option>
                <option value="autumn">Automne (orange)</option>
                <option value="winter">Hiver (bleu)</option>
              </optgroup>
              <optgroup label="Combinaisons">
                {(f.theme_presets || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>
            </select>
          </L>
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Combinaisons de couleurs (2 couleurs chacune)</div>
          <div className="space-y-2">
            {(f.theme_presets || []).map((p, i) => {
              const setP = (patch) => { const a = [...(f.theme_presets || [])]; a[i] = { ...a[i], ...patch }; set("theme_presets", a); };
              const active = (f.theme_mode || "auto") === "manual" && (f.theme_manual || "") === p.id;
              return (
                <div key={p.id} className={`flex items-center gap-2 rounded-xl p-2 border ${active ? "border-mint-400 bg-mint-50/50" : "border-slate-100"}`} data-testid={`theme-preset-${i}`}>
                  <div className="flex -space-x-1 shrink-0">
                    <span className="w-6 h-6 rounded-full border-2 border-white shadow" style={{ background: p.accent }} />
                    <span className="w-6 h-6 rounded-full border-2 border-white shadow" style={{ background: p.bg }} />
                  </div>
                  <input value={p.name} onChange={(e) => setP({ name: e.target.value })} className={`${inp} flex-1 min-w-[120px]`} data-testid={`theme-preset-name-${i}`} />
                  <input type="color" value={p.accent} onChange={(e) => setP({ accent: e.target.value })} className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer shrink-0" title="Couleur principale" data-testid={`theme-preset-accent-${i}`} />
                  <input type="color" value={p.bg} onChange={(e) => setP({ bg: e.target.value })} className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer shrink-0" title="Couleur de fond" data-testid={`theme-preset-bg-${i}`} />
                  <button onClick={() => { set("theme_mode", "manual"); set("theme_manual", p.id); }} className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold ${active ? "bg-mint-600 text-white" : "bg-white border border-mint-200 text-mint-700 hover:border-mint-400"}`} data-testid={`theme-preset-apply-${i}`}>{active ? "Actif" : "Appliquer"}</button>
                  <button onClick={() => set("theme_presets", (f.theme_presets || []).filter((_, x) => x !== i))} className="text-slate-400 hover:text-red-500 shrink-0" data-testid={`theme-preset-del-${i}`}><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
            <button onClick={() => set("theme_presets", [...(f.theme_presets || []), { id: `t${Date.now()}`, name: "Nouvelle combinaison", accent: "#E8B4B8", bg: "#FDF8F5" }])} data-testid="theme-preset-add" className="flex items-center gap-1.5 text-mint-700 text-sm font-semibold"><Plus className="w-4 h-4" /> Ajouter une combinaison</button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Astuce : cliquez « Appliquer » puis « Enregistrer les paramètres » pour activer une combinaison sur tout le site.</p>
        </div>
      </div>

      <div>
        <h3 className="font-display font-bold text-lg mb-1">Application mobile (footer)</h3>
        <p className="text-sm text-slate-500 mb-3">Affiche les boutons App Store / Google Play dans le pied de page.</p>
        <label className="flex items-center gap-2 mb-3 text-sm font-medium">
          <input type="checkbox" checked={!!f.app_download_enabled} onChange={(e) => set("app_download_enabled", e.target.checked)} data-testid="set-app-enabled" className="w-4 h-4 accent-mint-600" />
          Activer la section « Téléchargez notre application »
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <L label="Lien App Store (iOS)"><input value={f.app_store_url || ""} onChange={(e) => set("app_store_url", e.target.value)} placeholder="https://apps.apple.com/…" data-testid="set-app-store" className={inp} /></L>
          <L label="Lien Google Play (Android)"><input value={f.play_store_url || ""} onChange={(e) => set("play_store_url", e.target.value)} placeholder="https://play.google.com/…" data-testid="set-play-store" className={inp} /></L>
        </div>
      </div>

      <div>
        <h3 className="font-display font-bold text-lg mb-1">Réponses rapides du chat</h3>
        <p className="text-sm text-slate-500 mb-3">Messages pré-écrits que vous pourrez envoyer en un clic depuis le chat pour orienter le client.</p>
        <div className="space-y-2">
          {(f.chat_quick_replies || []).map((q, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={q} onChange={(e) => { const arr = [...(f.chat_quick_replies || [])]; arr[i] = e.target.value; set("chat_quick_replies", arr); }} data-testid={`quick-reply-${i}`} className={inp} />
              <button onClick={() => { const arr = (f.chat_quick_replies || []).filter((_, j) => j !== i); set("chat_quick_replies", arr); }} data-testid={`quick-reply-del-${i}`} className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <button onClick={() => set("chat_quick_replies", [...(f.chat_quick_replies || []), ""])} data-testid="quick-reply-add" className="flex items-center gap-2 px-4 py-2 rounded-full bg-mint-50 border border-mint-200 text-mint-700 font-semibold text-sm hover:border-mint-400"><Plus className="w-4 h-4" /> Ajouter une réponse rapide</button>
        </div>
      </div>
      <div>
        <h3 className="font-display font-bold text-lg mb-3">Pages légales (footer)</h3>
        <L label="Politique de confidentialité"><textarea rows={6} value={f.privacy_content || ""} onChange={(e) => set("privacy_content", e.target.value)} data-testid="set-privacy" className={inp} /></L>
        <div className="mt-3"><L label="Conditions Générales de Vente (CGV)"><textarea rows={6} value={f.cgv_content || ""} onChange={(e) => set("cgv_content", e.target.value)} data-testid="set-cgv" className={inp} /></L></div>
      </div>
      <button onClick={save} disabled={busy} data-testid="settings-save" className="px-6 py-3 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold disabled:opacity-50">{busy ? "…" : "Enregistrer les paramètres"}</button>
    </div>
  );
}
