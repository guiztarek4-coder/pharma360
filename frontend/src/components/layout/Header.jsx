import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, User, ShoppingCart, Phone, Menu, X, Leaf } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import api, { formatDA, mediaUrl } from "@/lib/api";
import { SITE, CATEGORIES } from "@/lib/site";

const Logo = () => (
  <Link to="/" data-testid="header-logo" className="flex items-center gap-2 shrink-0">
    <div className="relative w-9 h-9 rounded-xl bg-mint-600 grid place-items-center shadow-md shadow-mint-600/30">
      <Leaf className="w-5 h-5 text-white" />
      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-mint-200 border-2 border-white grid place-items-center text-[8px] font-bold text-mint-800">+</span>
    </div>
    <div className="leading-none">
      <div className="font-display font-extrabold text-lg sm:text-xl text-slate-dark">Pharma<span className="text-mint-600">360</span></div>
      <div className="text-[9px] font-mono-label text-mint-700 hidden sm:block">Parapharmacie · Algérie</div>
    </div>
  </Link>
);

function SearchBar({ mobile }) {
  const [q, setQ] = useState("");
  const [sug, setSug] = useState(null);
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const ref = useRef();

  useEffect(() => {
    if (q.length < 2) { setSug(null); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/search/suggestions?q=${encodeURIComponent(q)}`);
        setSug(data);
      } catch {}
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) { navigate(`/catalogue?search=${encodeURIComponent(q)}`); setFocused(false); }
  };

  return (
    <div className={`relative ${mobile ? "w-full" : "flex-1 max-w-xl"}`} ref={ref}>
      <form onSubmit={submit}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            data-testid="header-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="Rechercher un produit, une marque..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full border border-mint-100 bg-mint-50/60 text-sm outline-none focus:ring-2 focus:ring-mint-500 focus:bg-white transition-all"
          />
        </div>
      </form>
      {focused && sug && (sug.products.length > 0 || sug.brands.length > 0) && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-xl border border-mint-100 p-2 max-h-96 overflow-auto" data-testid="search-suggestions">
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
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-mint-100 shadow-sm" data-testid="site-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4 h-16">
          <button className="lg:hidden text-slate-dark" onClick={() => setMobileMenu(true)} data-testid="mobile-menu-open">
            <Menu className="w-6 h-6" />
          </button>
          <Logo />
          <div className="hidden md:block flex-1">
            <SearchBar />
          </div>
          <div className="flex items-center gap-1 sm:gap-3 ml-auto">
            <a href={`tel:${SITE.phoneLink}`} data-testid="header-phone"
              className="hidden lg:flex items-center gap-2 text-sm font-semibold text-slate-dark hover:text-mint-600 transition-colors">
              <span className="w-9 h-9 rounded-full bg-mint-50 grid place-items-center"><Phone className="w-4 h-4 text-mint-600" /></span>
              {SITE.phone}
            </a>
            <Link to={user && user.role === "admin" ? "/admin" : "/compte"} data-testid="header-account"
              className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-full hover:bg-mint-50 transition-colors">
              <User className="w-5 h-5 text-slate-dark" />
              <span className="hidden xl:block text-sm font-medium">{user ? user.first_name : "Mon compte"}</span>
            </Link>
            <button onClick={() => setOpen(true)} data-testid="header-cart-button"
              className="relative flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-mint-600 text-white hover:bg-mint-700 transition-colors shadow-md shadow-mint-600/30">
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

      {/* Category nav desktop */}
      <nav className="hidden lg:block border-t border-mint-50 bg-mint-50/40">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-1 h-11">
          {CATEGORIES.map((c) => (
            <Link key={c.id} to={`/categorie/${c.id}`} data-testid={`category-nav-${c.id}`}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-mint-700 rounded-lg hover:bg-white transition-colors">
              {c.label}
            </Link>
          ))}
          <span className="mx-2 w-px h-4 bg-mint-200" />
          <Link to="/marques" className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-mint-700 transition-colors">Marques</Link>
          <Link to="/catalogue?on_promo=1" className="px-3 py-1.5 text-sm font-semibold text-red-500 hover:text-red-600 transition-colors">Promotions</Link>
          <Link to="/catalogue?is_new=1" className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-mint-700 transition-colors">Nouveautés</Link>
          <Link to="/blog" className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-mint-700 transition-colors">Blog</Link>
          <Link to="/contact" className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-mint-700 transition-colors">Contact</Link>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileMenu && (
        <div className="fixed inset-0 z-50 lg:hidden" data-testid="mobile-menu">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileMenu(false)} />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85%] bg-white p-5 overflow-auto animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <Logo />
              <button onClick={() => setMobileMenu(false)} data-testid="mobile-menu-close"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-1">
              {CATEGORIES.map((c) => (
                <Link key={c.id} to={`/categorie/${c.id}`} onClick={() => setMobileMenu(false)}
                  className="block px-3 py-2.5 rounded-lg hover:bg-mint-50 font-medium text-slate-700">{c.label}</Link>
              ))}
              <div className="h-px bg-mint-100 my-2" />
              <Link to="/marques" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg hover:bg-mint-50 font-medium">Marques</Link>
              <Link to="/catalogue?on_promo=1" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg hover:bg-mint-50 font-semibold text-red-500">Promotions</Link>
              <Link to="/catalogue?is_new=1" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg hover:bg-mint-50 font-medium">Nouveautés</Link>
              <Link to="/blog" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg hover:bg-mint-50 font-medium">Blog</Link>
              <Link to="/contact" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg hover:bg-mint-50 font-medium">Contact</Link>
              <Link to="/compte" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg hover:bg-mint-50 font-medium">Mon compte</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
