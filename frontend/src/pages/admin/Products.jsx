import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { api, fmtPrice, apiError } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const EMPTY = { name: "", description: "", category: "Soins Visage", price: "", member_price: "", stock: 0, image: "", featured: false };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState([]);
  const [catFilter, setCatFilter] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [bulkDiscount, setBulkDiscount] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | product
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get("/products").then((r) => setProducts(r.data)).catch(() => {});
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
  };
  useEffect(load, []);

  const visible = catFilter ? products.filter((p) => p.category === catFilter) : products;
  const allVisibleSelected = visible.length > 0 && visible.every((p) => selected.includes(p.id));

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelected((s) => s.filter((id) => !visible.some((p) => p.id === id)));
    } else {
      setSelected((s) => [...new Set([...s, ...visible.map((p) => p.id)])]);
    }
  };

  const bulk = async (action, value) => {
    if (selected.length === 0) { toast.info("Sélectionnez d'abord des produits"); return; }
    try {
      const { data } = await api.post("/admin/products/bulk", { ids: selected, action, value });
      toast.success(data.message);
      setSelected([]);
      load();
    } catch (e) { toast.error(apiError(e)); }
  };

  const openNew = () => { setForm(EMPTY); setEditing("new"); };
  const openEdit = (p) => { setForm({ ...p }); setEditing(p); };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const payload = { ...form, price: parseFloat(form.price) || 0, member_price: parseFloat(form.member_price) || 0, stock: parseInt(form.stock) || 0 };
    try {
      if (editing === "new") {
        await api.post("/admin/products", payload);
        toast.success("Produit créé");
      } else {
        await api.put(`/admin/products/${editing.id}`, payload);
        toast.success("Produit mis à jour");
      }
      setEditing(null);
      load();
    } catch (err) { toast.error(apiError(err)); } finally { setSaving(false); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Supprimer « ${p.name} » ?`)) return;
    await api.delete(`/admin/products/${p.id}`);
    toast.success("Produit supprimé");
    load();
  };

  return (
    <div data-testid="admin-products">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); }} data-testid="admin-category-filter"
            className="input-field !w-auto !py-2 text-xs font-semibold">
            <option value="">Toutes les catégories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={toggleAll} data-testid="select-category-button"
            className="rounded-full border px-4 py-2 text-xs font-semibold text-obsidian/70 transition-colors hover:border-brand hover:text-brand">
            {allVisibleSelected ? "Tout désélectionner" : catFilter ? `Sélectionner « ${catFilter} » (${visible.length})` : "Tout sélectionner"}
          </button>
        </div>
        <button onClick={openNew} className="btn-brand !py-2.5 text-xs" data-testid="new-product-button">
          <Plus size={14} /> Nouveau produit
        </button>
      </div>

      {selected.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-brand/30 bg-brand-pale p-4" data-testid="bulk-actions-bar">
          <span className="text-xs font-bold text-brand" data-testid="bulk-count">{selected.length} sélectionné(s)</span>
          <div className="flex items-center gap-2">
            <input type="number" placeholder="Stock" value={bulkStock} onChange={(e) => setBulkStock(e.target.value)}
              data-testid="bulk-stock-input" className="input-field !w-24 !py-1.5 text-xs" />
            <button onClick={() => bulk("set_stock", bulkStock)} data-testid="bulk-stock-apply"
              className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-bone">Définir stock</button>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" placeholder="%" value={bulkDiscount} onChange={(e) => setBulkDiscount(e.target.value)}
              data-testid="bulk-discount-input" className="input-field !w-20 !py-1.5 text-xs" />
            <button onClick={() => bulk("apply_discount", bulkDiscount)} data-testid="bulk-discount-apply"
              className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-bone">Appliquer remise membre</button>
          </div>
          <button onClick={() => bulk("set_featured", 1)} data-testid="bulk-feature"
            className="rounded-full border border-brand px-3 py-1.5 text-xs font-semibold text-brand">Mettre en vedette</button>
          <button onClick={() => bulk("delete")} data-testid="bulk-delete"
            className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">Supprimer</button>
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-3xl border bg-white" data-testid="products-table">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-wider text-stone2">
              <th className="p-4 w-10"></th>
              <th className="p-4">Produit</th>
              <th className="p-4">Catégorie</th>
              <th className="p-4">Prix</th>
              <th className="p-4">Prix membre</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Vedette</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-sand/50" data-testid={`product-row-${p.id}`}>
                <td className="p-4">
                  <input type="checkbox" checked={selected.includes(p.id)} data-testid={`select-product-${p.id}`}
                    onChange={() => setSelected((s) => s.includes(p.id) ? s.filter((id) => id !== p.id) : [...s, p.id])}
                    className="h-4 w-4 accent-[#3E4E30]" />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    <span className="font-medium text-obsidian">{p.name}</span>
                  </div>
                </td>
                <td className="p-4 text-stone2">{p.category}</td>
                <td className="p-4 font-mono text-xs">{fmtPrice(p.price)}</td>
                <td className="p-4 font-mono text-xs font-semibold text-brand">{fmtPrice(p.member_price)}</td>
                <td className="p-4">
                  <span className={`font-mono text-xs font-bold ${p.stock < 10 ? "text-terra" : "text-obsidian"}`} data-testid={`stock-${p.id}`}>{p.stock}</span>
                </td>
                <td className="p-4">{p.featured && <Star size={15} className="fill-gold text-gold" />}</td>
                <td className="p-4">
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(p)} data-testid={`edit-product-${p.id}`} aria-label="Modifier"
                      className="flex h-8 w-8 items-center justify-center rounded-full border text-stone2 hover:border-brand hover:text-brand">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => remove(p)} data-testid={`delete-product-${p.id}`} aria-label="Supprimer"
                      className="flex h-8 w-8 items-center justify-center rounded-full border text-stone2 hover:border-red-500 hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg" data-testid="product-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{editing === "new" ? "Nouveau produit" : "Modifier le produit"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="mt-2 space-y-3" data-testid="product-form">
            <input required placeholder="Nom du produit" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="product-form-name" className="input-field" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              data-testid="product-form-category" className="input-field">
              {["Soins Visage", "Dermatologie", "Hygiène & Corps", "Compléments", "Bébés"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <textarea placeholder="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              data-testid="product-form-description" className="input-field resize-none" />
            <div className="grid grid-cols-3 gap-3">
              <input required type="number" step="1" placeholder="Prix" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                data-testid="product-form-price" className="input-field" />
              <input required type="number" step="1" placeholder="Prix membre" value={form.member_price} onChange={(e) => setForm({ ...form, member_price: e.target.value })}
                data-testid="product-form-member-price" className="input-field" />
              <input required type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}
                data-testid="product-form-stock" className="input-field" />
            </div>
            <input placeholder="URL de l'image" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })}
              data-testid="product-form-image" className="input-field" />
            <label className="flex items-center gap-2 text-sm text-obsidian">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                data-testid="product-form-featured" className="h-4 w-4 accent-[#3E4E30]" />
              Produit en vedette (page d'accueil)
            </label>
            <button type="submit" disabled={saving} data-testid="product-form-submit" className="btn-brand w-full disabled:opacity-50">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
