import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { Search, User, ShoppingCart, Phone, Menu, X, Leaf, ChevronRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useCategories } from "@/context/CategoriesContext";
import api, { formatDA, mediaUrl } from "@/lib/api";

const Logo = ({ settings }) => (
  <Link to="/" data-testid="header-logo" className="flex items-center gap-2 shrink-0">
    {settings?.logo ? (
      <img src={mediaUrl(settings.logo)} alt={settings.brand_name} className="h-9 sm:h-10 w-auto object-contain max-w-[140px]" />
    ) : (
      <>
        <div className="relative w-9 h-9 rounded-xl bg-mint-600 grid place-items-center shadow-md shadow-mint-600/30">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <div className="leading-none">
          <div className="font-display font-extrabold text-lg sm:text-xl text-slate-dark">Pharma<span className="text-mint-600">360</span></div>
          <div className="text-[9px] font-mono-label text-mint-700 hidden sm:block">Parapharmacie · Algérie</div>
        </div>
      </>
    )}
  </Link>
);

function SearchBar({ mobile }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [sug, setSug] = useState(null);
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const { categories } = useCategories();

  useEffect(() => {
    if (q.length < 2) { setSug(null); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/search/suggestions?q=${encodeURIComponent(q)}`);
        setSug(data);
      } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("search", q.trim());
    if (cat) params.set("category_id", cat);
    if (params.toString()) { navigate(`/catalogue?${params.toString()}`); setFocused(false); }
  };

  return (
    <div className={`relative ${mobile ? "w-full" : "flex-1 max-w-xl"}`}>
      <form onSubmit={submit}>
        <div className="relative flex items-stretch rounded-full border border-mint-100 bg-mint-50/60 focus-within:ring-2 focus-within:ring-mint-500 focus-within:bg-white transition-all overflow-hidden">
          <select value={cat} onChange={(e) => setCat(e.target.value)} data-testid="header-search-category"
            className="hidden sm:block max-w-[140px] pl-3 pr-1 bg-transparent text-sm text-slate-600 outline-none border-r border-mint-100 cursor-pointer">
            <option value="">Toutes catég.</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              data-testid="header-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 200)}
              placeholder="Rechercher un produit, une marque..."
              className="w-full pl-10 pr-4 py-2.5 bg-transparent text-sm outline-none"
            />
          </div>
        </div>
      </form>
      {focused && sug && (sug.products.length > 0 || sug.brands.length > 0) && (
        <div className="absolute z-[60] mt-2 w-full bg-white rounded-2xl shadow-xl border border-mint-100 p-2 max-h-96 overflow-auto" data-testid="search-suggestions">
          {sug.brands.map((b) => (
            <button key={b} onMouseDown={() => navigate(`/catalogue?brand=${encodeURIComponent(b)}`)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-mint-50 text-sm flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-mint-500" /> <span className="text-slate-600">Marque :</span> <span className="font-semibold">{b}</span>
            </button>
          ))}
          {sug.products.map((p) => (
            <button key={p.id} onMouseDown={() => navigate(`/produit/${p.id}`)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-mint-50 flex items-center gap-3">
              <img src={mediaUrl(p.images?.[0])} alt="" className="w-9 h-9 rounded-lg object-cover bg-mint-50" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{p.name}</div>
                <div className="text-xs text-mint-700 font-semibold">{formatDA(p.price)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { count, total, setOpen } = useCart();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { categories } = useCategories();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [openMain, setOpenMain] = useState(null);
  const [openSub, setOpenSub] = useState(null);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-mint-100 shadow-sm" data-testid="site-header">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4 h-16">
          <button className="md:hidden flex items-center gap-1 text-slate-dark font-semibold text-sm shrink-0" onClick={() => setMobileMenu(true)} data-testid="mobile-menu-open">
            <Menu className="w-6 h-6" /><span className="hidden xs:inline">Menu</span>
          </button>
          <Logo settings={settings} />
          <div className="hidden md:block flex-1">
            <SearchBar />
          </div>
          <div className="flex items-center gap-1 sm:gap-3 ml-auto">
            <a href={`tel:${settings.phone_link}`} data-testid="header-phone"
              className="hidden lg:flex items-center gap-2 text-sm font-semibold text-slate-dark hover:text-mint-600 transition-colors">
              <span className="w-9 h-9 rounded-full bg-mint-50 grid place-items-center"><Phone className="w-4 h-4 text-mint-600" /></span>
              {settings.phone}
            </a>
            <Link to={user && user.role === "admin" ? "/admin" : "/compte"} data-testid="header-account"
              className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-full hover:bg-mint-50 transition-colors">
              <User className="w-5 h-5 text-slate-dark" />
              <span className="hidden xl:block text-sm font-medium">{user ? user.first_name : "Mon compte"}</span>
            </Link>
            <button onClick={() => setOpen(true)} data-testid="header-cart-button"
              className="relative flex items-center gap-2 pl-3 pr-3 sm:pr-4 py-2 rounded-full bg-mint-600 text-white hover:bg-mint-700 transition-colors shadow-md shadow-mint-600/30">
              <ShoppingCart className="w-5 h-5" />
              {count > 0 && (
                <span data-testid="cart-item-count-badge" className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center border-2 border-white">{count}</span>
              )}
              <span className="hidden sm:block text-sm font-semibold">{formatDA(total)}</span>
            </button>
          </div>
        </div>
        <div className="md:hidden pb-3">
          <SearchBar mobile />
        </div>
      </div>

      {/* Category nav (desktop/tablet) — 3-level dropdowns */}
      <nav className="hidden md:block border-t border-mint-50 bg-mint-50/40" data-testid="category-nav">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center gap-x-0.5 gap-y-1 py-2">
          {categories.map((c) => (
            <div key={c.id} className="relative group">
              <Link to={`/categorie/${c.id}`} data-testid={`category-nav-${c.id}`}
                className="px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:text-mint-700 rounded-lg hover:bg-white transition-colors whitespace-nowrap inline-block">
                {c.label}
              </Link>
              {c.children && c.children.length > 0 && (
                <div className="absolute left-0 top-full z-[70] hidden group-hover:block pt-1">
                  <div className="bg-white rounded-xl shadow-xl border border-mint-100 py-2 min-w-[220px]">
                    {c.children.map((s) => (
                      <div key={s.id} className="relative group/sub">
                        <Link to={`/categorie/${s.id}`} data-testid={`category-nav-sub-${s.id}`}
                          className="flex items-center justify-between gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-mint-50 hover:text-mint-700 whitespace-nowrap">
                          {s.label}
                          {s.children && s.children.length > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                        </Link>
                        {s.children && s.children.length > 0 && (
                          <div className="absolute left-full top-0 z-[80] hidden group-hover/sub:block pl-1">
                            <div className="bg-white rounded-xl shadow-xl border border-mint-100 py-2 min-w-[210px]">
                              {s.children.map((ss) => (
                                <Link key={ss.id} to={`/categorie/${ss.id}`} data-testid={`category-nav-leaf-${ss.id}`}
                                  className="block px-4 py-2 text-sm text-slate-600 hover:bg-mint-50 hover:text-mint-700 whitespace-nowrap">{ss.label}</Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          <span className="mx-2 w-px h-4 bg-mint-200 shrink-0" />
          <Link to="/marques" data-testid="nav-marques" className="px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:text-mint-700 transition-colors whitespace-nowrap">Marques</Link>
          <Link to="/catalogue?is_new=1" data-testid="nav-nouveaux" className="px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:text-mint-700 transition-colors whitespace-nowrap">Nouveaux produits</Link>
          <Link to="/catalogue?on_promo=1" data-testid="nav-promo" className="px-2.5 py-1.5 text-sm font-semibold text-red-500 hover:text-red-600 transition-colors whitespace-nowrap">Promo</Link>
          <Link to="/fidelite" data-testid="nav-fidelite" className="px-2.5 py-1.5 text-sm font-semibold text-mint-700 hover:text-mint-800 transition-colors whitespace-nowrap">Fidélité</Link>
          <Link to="/carte-cadeau" data-testid="nav-carte-cadeau" className="px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:text-mint-700 transition-colors whitespace-nowrap">Carte cadeau</Link>
        </div>
      </nav>

      {/* Mobile drawer via portal */}
      {mobileMenu && createPortal(
        <div className="fixed inset-0 z-[9999] md:hidden" data-testid="mobile-menu">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileMenu(false)} />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85%] bg-white p-5 overflow-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <Logo settings={settings} />
              <button onClick={() => setMobileMenu(false)} data-testid="mobile-menu-close"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-1">
              {categories.map((c) => (
                <div key={c.id}>
                  <div className="flex items-center">
                    <Link to={`/categorie/${c.id}`} onClick={() => setMobileMenu(false)}
                      className="flex-1 px-3 py-2.5 rounded-lg hover:bg-mint-50 font-medium text-slate-700">{c.label}</Link>
                    {c.children && c.children.length > 0 && (
                      <button onClick={() => setOpenMain(openMain === c.id ? null : c.id)} className="p-2 text-slate-400" data-testid={`mobile-main-toggle-${c.id}`}>
                        <ChevronRight className={`w-4 h-4 transition-transform ${openMain === c.id ? "rotate-90" : ""}`} />
                      </button>
                    )}
                  </div>
                  {openMain === c.id && c.children?.map((s) => (
                    <div key={s.id}>
                      <div className="flex items-center">
                        <Link to={`/categorie/${s.id}`} onClick={() => setMobileMenu(false)}
                          className="flex-1 pl-7 pr-3 py-2 rounded-lg hover:bg-mint-50 text-sm text-slate-600 font-medium">{s.label}</Link>
                        {s.children && s.children.length > 0 && (
                          <button onClick={() => setOpenSub(openSub === s.id ? null : s.id)} className="p-2 text-slate-400" data-testid={`mobile-sub-toggle-${s.id}`}>
                            <ChevronRight className={`w-4 h-4 transition-transform ${openSub === s.id ? "rotate-90" : ""}`} />
                          </button>
                        )}
                      </div>
                      {openSub === s.id && s.children?.map((ss) => (
                        <Link key={ss.id} to={`/categorie/${ss.id}`} onClick={() => setMobileMenu(false)}
                          className="block pl-11 pr-3 py-2 rounded-lg hover:bg-mint-50 text-sm text-slate-500">{ss.label}</Link>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
              <div className="h-px bg-mint-100 my-2" />
              <Link to="/catalogue?is_new=1" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg hover:bg-mint-50 font-medium">Nouveaux produits</Link>
              <Link to="/catalogue?on_promo=1" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg hover:bg-mint-50 font-semibold text-red-500">Promo</Link>
              <Link to="/fidelite" onClick={() => setMobileMenu(false)} data-testid="mobile-nav-fidelite" className="block px-3 py-2.5 rounded-lg hover:bg-mint-50 font-semibold text-mint-700">Programme de fidélité</Link>
              <Link to="/carte-cadeau" onClick={() => setMobileMenu(false)} data-testid="mobile-nav-carte-cadeau" className="block px-3 py-2.5 rounded-lg hover:bg-mint-50 font-medium">Carte cadeau</Link>
              <div className="h-px bg-mint-100 my-2" />
              <Link to="/marques" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg hover:bg-mint-50 font-medium">Marques</Link>
              <Link to="/blog" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg hover:bg-mint-50 font-medium">Blog</Link>
              <Link to="/contact" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg hover:bg-mint-50 font-medium">Contact</Link>
              <Link to="/compte" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg hover:bg-mint-50 font-medium">Mon compte</Link>
            </div>
          </div>
        </div>, document.body)}
    </header>
  );
}
