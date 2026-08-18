import { useEffect, useState, useRef } from "react";
import { LayoutDashboard, Package, ShoppingBag, Tag, FileText, LogOut, Plus, Pencil, Trash2, X, Upload, TrendingUp, Users, Leaf, Settings, FolderTree, Ticket, Bell, Image as ImageIcon, UserCog, ChevronRight, GripVertical, Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import api, { formatDA, formatApiError, mediaUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useCategories } from "@/context/CategoriesContext";
import { WILAYAS } from "@/lib/site";

const inp = "w-full px-3 py-2 rounded-xl border border-mint-200 text-sm outline-none focus:ring-2 focus:ring-mint-500";
const L = ({ label, children }) => (<div><label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>{children}</div>);

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
          <input type="password" placeholder="Mot de passe" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} data-testid="admin-login-password" className={inp} />
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

const emptyProduct = { name: "", brand: "", category: "", category_id: "", subcategory: "", description: "", price: 0, old_price: null, stock: 0, images: [], badge: "", is_featured: false, is_new: false, need: "" };

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
    const payload = { ...f, price: Number(f.price), old_price: f.old_price ? Number(f.old_price) : null, stock: Number(f.stock), badge: f.badge || null, need: f.need || null, category_id: f.category_id, category: leaf.slug, subcategory: null };
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
  const [editing, setEditing] = useState(null);
  const [importKind, setImportKind] = useState(null);
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
    refreshCats();
  };
  useEffect(loadAll, []);

  const delProduct = async (id) => { await api.delete(`/products/${id}`); loadAll(); toast.success("Supprimé"); };
  const setStatus = async (id, status) => { await api.put(`/orders/${id}/status`, { status }); loadAll(); };
  const delBrand = async (id) => { await api.delete(`/brands/${id}`); loadAll(); };
  const delBlog = async (id) => { await api.delete(`/blog/${id}`); loadAll(); };
  const openTab = (t) => { setTab(t); if (t === "notifications" && notifs.unread) api.post("/notifications/read").then(() => api.get("/notifications").then((r) => setNotifs(r.data))); };

  const tabs = [
    { id: "stats", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "orders", label: "Commandes", icon: ShoppingBag },
    { id: "products", label: "Produits", icon: Package },
    { id: "customers", label: "Clients", icon: Users },
    { id: "brands", label: "Marques", icon: Tag },
    { id: "categories", label: "Catégories", icon: FolderTree },
    { id: "promo", label: "Codes promo", icon: Ticket },
    { id: "blog", label: "Blog", icon: FileText },
    { id: "banners", label: "Bannières", icon: ImageIcon },
    { id: "notifications", label: "Notifications", icon: Bell },
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
            </button>
          ))}
        </div>

        {tab === "stats" && stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[[TrendingUp, "Chiffre d'affaires", formatDA(stats.revenue)], [ShoppingBag, "Commandes", stats.orders], [Package, "Produits", stats.products], [Users, "Clients", stats.customers], [ShoppingBag, "En attente", stats.pending_orders], [Tag, "Marques", stats.brands]].map(([Icon, label, val], i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-5" data-testid={`stat-${i}`}>
                <Icon className="w-5 h-5 text-mint-600 mb-3" />
                <div className="font-display font-extrabold text-2xl">{val}</div>
                <div className="text-sm text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "products" && (
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => setEditing(emptyProduct)} data-testid="admin-add-product" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-mint-600 text-white font-semibold text-sm"><Plus className="w-4 h-4" /> Ajouter un produit</button>
              <button onClick={() => setImportKind("products")} data-testid="admin-import-products" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-mint-200 text-slate-700 font-semibold text-sm hover:border-mint-400"><Upload className="w-4 h-4" /> Importer (CSV / Excel)</button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]" data-testid="admin-products-table">
                <thead className="bg-mint-50 text-slate-500 text-xs uppercase"><tr><th className="text-left p-3">Produit</th><th className="text-left p-3 hidden sm:table-cell">Catégorie</th><th className="text-left p-3">Prix</th><th className="text-left p-3">Stock</th><th className="p-3"></th></tr></thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-t border-mint-50">
                      <td className="p-3"><div className="flex items-center gap-2"><img src={mediaUrl(p.images?.[0])} alt="" className="w-9 h-9 rounded-lg object-cover bg-mint-50" /><span className="font-medium line-clamp-1">{p.name}</span></div></td>
                      <td className="p-3 hidden sm:table-cell capitalize text-slate-500">{p.category}</td>
                      <td className="p-3 font-semibold text-mint-700 whitespace-nowrap">{formatDA(p.price)}</td>
                      <td className="p-3">{p.stock}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button onClick={() => setEditing(p)} data-testid={`admin-edit-${p.id}`} className="text-slate-400 hover:text-mint-700 mr-2"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => delProduct(p.id)} data-testid={`admin-del-${p.id}`} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                <div className="mt-3">
                  <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} data-testid={`admin-order-status-${o.id}`} className="px-3 py-1.5 rounded-full border border-mint-200 text-sm bg-white">
                    {["En attente", "Confirmée", "Expédiée", "Livrée", "Annulée"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "customers" && <CustomersPanel customers={customers} />}

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
        {tab === "promo" && <PromoPanel promos={promos} onChanged={loadAll} />}

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
        {tab === "notifications" && <NotificationsPanel notifs={notifs} />}
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

function CustomersPanel({ customers }) {
  const [selected, setSelected] = useState(null);
  const [orders, setOrders] = useState([]);
  const view = async (c) => { setSelected(c); const { data } = await api.get(`/customers/${c.id}/orders`); setOrders(data); };
  return (
    <div>
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]" data-testid="admin-customers-table">
          <thead className="bg-mint-50 text-slate-500 text-xs uppercase"><tr><th className="text-left p-3">Client</th><th className="text-left p-3">Contact</th><th className="text-left p-3">Inscrit le</th><th className="text-left p-3">Commandes</th><th className="p-3"></th></tr></thead>
          <tbody>
            {customers.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">Aucun client inscrit.</td></tr>}
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-mint-50" data-testid={`customer-${c.id}`}>
                <td className="p-3 font-medium">{c.first_name} {c.last_name}</td>
                <td className="p-3 text-slate-500">{c.email || c.phone || "—"}</td>
                <td className="p-3 text-slate-500">{c.created_at ? new Date(c.created_at).toLocaleDateString("fr-FR") : "—"}</td>
                <td className="p-3">{c.orders_count}</td>
                <td className="p-3 text-right"><button onClick={() => view(c)} className="text-mint-700 font-semibold text-sm">Voir</button></td>
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
      <L label="Nouveau mot de passe (laisser vide pour ne pas changer)"><input type="password" value={f.new_password} onChange={(e) => setF({ ...f, new_password: e.target.value })} data-testid="acc-new-password" className={inp} /></L>
      <div className="h-px bg-mint-100" />
      <L label="Mot de passe actuel *"><input type="password" value={f.current_password} onChange={(e) => setF({ ...f, current_password: e.target.value })} data-testid="acc-current-password" className={inp} /></L>
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
          <div className="sm:col-span-2"><L label="Adresse"><input value={f.address} onChange={(e) => set("address", e.target.value)} data-testid="set-address" className={inp} /></L></div>
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
        <div className="flex flex-wrap gap-5 mt-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.pickup_enabled} onChange={(e) => set("pickup_enabled", e.target.checked)} className="accent-mint-600 w-4 h-4" /> Retrait pharmacie</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.payment_cod_enabled} onChange={(e) => set("payment_cod_enabled", e.target.checked)} className="accent-mint-600 w-4 h-4" data-testid="set-cod" /> Paiement à la livraison</label>
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
      <button onClick={save} disabled={busy} data-testid="settings-save" className="px-6 py-3 rounded-full bg-mint-600 hover:bg-mint-700 text-white font-semibold disabled:opacity-50">{busy ? "…" : "Enregistrer les paramètres"}</button>
    </div>
  );
}
