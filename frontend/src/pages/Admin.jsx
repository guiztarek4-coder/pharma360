import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingBag, Tag, FileText, LogOut, Plus, Pencil, Trash2, X, Upload, TrendingUp, Users, Leaf } from "lucide-react";
import { toast } from "sonner";
import api, { formatDA, formatApiError, mediaUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CATEGORIES } from "@/lib/site";

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
          <input placeholder="Email admin" value={f.identifier} onChange={(e) => setF({ ...f, identifier: e.target.value })} data-testid="admin-login-email" className="w-full px-4 py-2.5 rounded-xl border border-mint-200 outline-none focus:ring-2 focus:ring-mint-500" />
          <input type="password" placeholder="Mot de passe" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} data-testid="admin-login-password" className="w-full px-4 py-2.5 rounded-xl border border-mint-200 outline-none focus:ring-2 focus:ring-mint-500" />
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
    <div className="flex items-center gap-3">
      {value && <img src={mediaUrl(value)} alt="" className="w-16 h-16 rounded-xl object-cover border border-mint-100" />}
      <input ref={ref} type="file" accept="image/*" onChange={upload} className="hidden" data-testid="admin-image-input" />
      <button type="button" onClick={() => ref.current.click()} disabled={busy} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-mint-200 text-sm font-medium hover:border-mint-400">
        <Upload className="w-4 h-4" /> {busy ? "…" : "Téléverser une image"}
      </button>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="ou coller une URL" className="flex-1 px-3 py-2 rounded-xl border border-mint-200 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
    </div>
  );
}

const emptyProduct = { name: "", brand: "", category: "visage", description: "", price: 0, old_price: null, stock: 0, images: [], badge: "", is_featured: false, is_new: false, need: "" };

function ProductForm({ product, brands, onClose, onSaved }) {
  const [f, setF] = useState(product || emptyProduct);
  const set = (k, v) => setF({ ...f, [k]: v });
  const save = async () => {
    if (!f.name || !f.price) { toast.error("Nom et prix requis"); return; }
    const payload = { ...f, price: Number(f.price), old_price: f.old_price ? Number(f.old_price) : null, stock: Number(f.stock), badge: f.badge || null, need: f.need || null };
    try {
      if (f.id) await api.put(`/products/${f.id}`, payload); else await api.post("/products", payload);
      toast.success("Produit enregistré"); onSaved();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto p-6">
        <div className="flex items-center justify-between mb-4"><h3 className="font-display font-bold text-lg">{f.id ? "Modifier" : "Nouveau"} produit</h3><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <div className="space-y-3">
          <L label="Nom"><input value={f.name} onChange={(e) => set("name", e.target.value)} data-testid="pf-name" className={inp} /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label="Marque"><input list="brandlist" value={f.brand} onChange={(e) => set("brand", e.target.value)} className={inp} />
              <datalist id="brandlist">{brands.map((b) => <option key={b.id} value={b.name} />)}</datalist></L>
            <L label="Catégorie"><select value={f.category} onChange={(e) => set("category", e.target.value)} className={inp}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></L>
          </div>
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
        </div>
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2 rounded-xl border border-mint-200 text-sm outline-none focus:ring-2 focus:ring-mint-500";
const L = ({ label, children }) => (<div><label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>{children}</div>);

function Dashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("stats");
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [brands, setBrands] = useState([]);
  const [blog, setBlog] = useState([]);
  const [editing, setEditing] = useState(null);
  const [brandForm, setBrandForm] = useState(null);
  const [blogForm, setBlogForm] = useState(null);

  const loadAll = () => {
    api.get("/admin/stats").then((r) => setStats(r.data));
    api.get("/products?limit=200").then((r) => setProducts(r.data));
    api.get("/orders").then((r) => setOrders(r.data));
    api.get("/brands").then((r) => setBrands(r.data));
    api.get("/blog").then((r) => setBlog(r.data));
  };
  useEffect(loadAll, []);

  const delProduct = async (id) => { await api.delete(`/products/${id}`); loadAll(); toast.success("Supprimé"); };
  const setStatus = async (id, status) => { await api.put(`/orders/${id}/status`, { status }); loadAll(); };
  const delBrand = async (id) => { await api.delete(`/brands/${id}`); loadAll(); };
  const delBlog = async (id) => { await api.delete(`/blog/${id}`); loadAll(); };

  const tabs = [
    { id: "stats", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "products", label: "Produits", icon: Package },
    { id: "orders", label: "Commandes", icon: ShoppingBag },
    { id: "brands", label: "Marques", icon: Tag },
    { id: "blog", label: "Blog", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-mint-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2"><span className="w-9 h-9 rounded-xl bg-mint-600 grid place-items-center"><Leaf className="w-5 h-5 text-white" /></span><h1 className="font-display font-extrabold text-xl">Pharma360 Admin</h1></div>
          <button onClick={logout} data-testid="admin-logout" className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-500"><LogOut className="w-4 h-4" /> Déconnexion</button>
        </div>

        <div className="flex gap-2 overflow-auto no-scrollbar mb-6">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} data-testid={`admin-tab-${t.id}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${tab === t.id ? "bg-mint-600 text-white" : "bg-white border border-mint-200 text-slate-600"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
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
            <button onClick={() => setEditing(emptyProduct)} data-testid="admin-add-product" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-mint-600 text-white font-semibold text-sm mb-4"><Plus className="w-4 h-4" /> Ajouter un produit</button>
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
              <table className="w-full text-sm" data-testid="admin-products-table">
                <thead className="bg-mint-50 text-slate-500 text-xs uppercase"><tr><th className="text-left p-3">Produit</th><th className="text-left p-3 hidden sm:table-cell">Catégorie</th><th className="text-left p-3">Prix</th><th className="text-left p-3">Stock</th><th className="p-3"></th></tr></thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-t border-mint-50">
                      <td className="p-3 flex items-center gap-2"><img src={mediaUrl(p.images?.[0])} alt="" className="w-9 h-9 rounded-lg object-cover bg-mint-50" /><span className="font-medium line-clamp-1">{p.name}</span></td>
                      <td className="p-3 hidden sm:table-cell capitalize text-slate-500">{p.category}</td>
                      <td className="p-3 font-semibold text-mint-700">{formatDA(p.price)}</td>
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
                  <div><span className="font-mono-label text-xs text-slate-400">#{o.id.slice(-8).toUpperCase()}</span><div className="font-semibold">{o.full_name} · {o.phone}</div><div className="text-sm text-slate-500">{o.street}, {o.commune} {o.wilaya}</div></div>
                  <div className="text-right"><div className="font-display font-bold text-mint-700">{formatDA(o.total)}</div><div className="text-xs text-slate-400">{o.payment_method === "card" ? "Carte (démo)" : "À la livraison"}</div></div>
                </div>
                <div className="mt-3 text-sm text-slate-600">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</div>
                <div className="mt-3 flex items-center gap-2">
                  <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} data-testid={`admin-order-status-${o.id}`} className="px-3 py-1.5 rounded-full border border-mint-200 text-sm bg-white">
                    {["En attente", "Confirmée", "Expédiée", "Livrée", "Annulée"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "brands" && (
          <div>
            <button onClick={() => setBrandForm({ name: "", logo: "", description: "" })} data-testid="admin-add-brand" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-mint-600 text-white font-semibold text-sm mb-4"><Plus className="w-4 h-4" /> Ajouter une marque</button>
            <div className="grid sm:grid-cols-3 gap-3">
              {brands.map((b) => (
                <div key={b.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">{b.logo && <img src={mediaUrl(b.logo)} alt="" className="w-10 h-10 object-contain" />}<span className="font-semibold">{b.name}</span></div>
                  <div><button onClick={() => setBrandForm(b)} className="text-slate-400 hover:text-mint-700 mr-2"><Pencil className="w-4 h-4" /></button><button onClick={() => delBrand(b.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div>
                </div>
              ))}
            </div>
          </div>
        )}

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
      </div>

      {editing && <ProductForm product={editing.id ? editing : null} brands={brands} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); loadAll(); }} />}
      {brandForm && <BrandForm brand={brandForm} onClose={() => setBrandForm(null)} onSaved={() => { setBrandForm(null); loadAll(); }} />}
      {blogForm && <BlogForm post={blogForm} onClose={() => setBlogForm(null)} onSaved={() => { setBlogForm(null); loadAll(); }} />}
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

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto p-6 space-y-3">
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
