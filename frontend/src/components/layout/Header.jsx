import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Leaf, Heart, ShoppingBag, Menu, X, Sparkles, LogOut, LayoutDashboard, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useSite } from "@/context/SiteContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/", label: "Accueil", testid: "nav-accueil" },
  { to: "/catalogue", label: "Catalogue", testid: "nav-catalogue" },
  { to: "/fidelite", label: "Fidélité", testid: "nav-fidelite" },
];

export default function Header() {
  const { user, favorites, logout } = useAuth();
  const { count } = useCart();
  const { settings } = useSite();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToContact = () => {
    setOpen(false);
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }), 350);
    } else {
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="fixed top-0 inset-x-0 z-40" data-testid="site-header">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/40 bg-bone/80 px-4 py-3 shadow-[0_8px_32px_-16px_rgba(24,28,20,0.25)] backdrop-blur-xl">
          <Link to="/" className="flex items-center gap-2.5" data-testid="logo-link">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-bone">
              <Leaf size={18} strokeWidth={2.2} />
            </span>
            <span className="leading-none">
              <span className="block font-serif text-xl font-semibold tracking-tight text-obsidian">L'olivier</span>
              <span className="badge-mono text-stone2 text-[9px]">Parapharmacie</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex" data-testid="main-nav">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} data-testid={n.testid}
                className="text-sm font-medium text-obsidian/70 transition-colors hover:text-brand">
                {n.label}
              </Link>
            ))}
            <button onClick={scrollToContact} data-testid="nav-contact"
              className="text-sm font-medium text-obsidian/70 transition-colors hover:text-brand">
              Contact
            </button>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {user && (
              <Link to="/compte" data-testid="loyalty-points-chip"
                className="hidden items-center gap-1.5 rounded-full bg-brand-pale px-3 py-1.5 text-xs font-semibold text-brand sm:flex">
                <Sparkles size={13} />
                <span className="font-mono">{user.points ?? 0} pts</span>
              </Link>
            )}
            <Link to="/favoris" data-testid="favorites-link" aria-label="Favoris"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-obsidian/70 transition-colors hover:bg-brand-pale hover:text-brand">
              <Heart size={18} />
              {favorites.length > 0 && (
                <span data-testid="favorites-count" className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terra px-1 text-[10px] font-bold text-white">
                  {favorites.length}
                </span>
              )}
            </Link>
            <Link to="/panier" data-testid="cart-link" aria-label="Panier"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-obsidian/70 transition-colors hover:bg-brand-pale hover:text-brand">
              <ShoppingBag size={18} />
              {count > 0 && (
                <span data-testid="cart-count" className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-bone">
                  {count}
                </span>
              )}
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button data-testid="user-menu-button" aria-label="Menu utilisateur"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-bone">
                    {user.name?.charAt(0)?.toUpperCase() || <UserRound size={16} />}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold" data-testid="user-menu-name">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/compte")} data-testid="menu-mon-compte">
                    <UserRound className="mr-2 h-4 w-4" /> Mon compte
                  </DropdownMenuItem>
                  {user.role === "admin" && (
                    <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin">
                      <LayoutDashboard className="mr-2 h-4 w-4" /> Administration
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} data-testid="menu-logout">
                    <LogOut className="mr-2 h-4 w-4" /> Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth" data-testid="login-link"
                className="hidden rounded-full bg-brand px-4 py-2 text-xs font-semibold text-bone transition-all hover:bg-brand-hover sm:block">
                Se connecter
              </Link>
            )}

            <button onClick={() => setOpen(!open)} data-testid="mobile-menu-button" aria-label="Menu"
              className="flex h-9 w-9 items-center justify-center rounded-full text-obsidian md:hidden">
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="mt-2 rounded-2xl border bg-bone/95 p-4 shadow-lg backdrop-blur-xl md:hidden" data-testid="mobile-menu">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} data-testid={`mobile-${n.testid}`}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-obsidian hover:bg-brand-pale">
                {n.label}
              </Link>
            ))}
            <button onClick={scrollToContact} data-testid="mobile-nav-contact"
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-obsidian hover:bg-brand-pale">
              Contact
            </button>
            {!user && (
              <Link to="/auth" onClick={() => setOpen(false)} data-testid="mobile-login-link"
                className="mt-2 block rounded-xl bg-brand px-4 py-3 text-center text-sm font-semibold text-bone">
                Se connecter
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
