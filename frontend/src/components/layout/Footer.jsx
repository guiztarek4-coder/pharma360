import { Link } from "react-router-dom";
import { Leaf, Phone, MapPin, Instagram, Clock, Facebook, Music2, MessageCircle } from "lucide-react";
import { useSite } from "@/context/SiteContext";

const CATEGORIES = ["Soins Visage", "Dermatologie", "Hygiène & Corps", "Compléments", "Bébés"];

export default function Footer() {
  const { settings } = useSite();
  const c = settings.contact;

  return (
    <footer id="contact" className="relative overflow-hidden bg-obsidian text-bone grain" data-testid="site-footer">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-bone">
                <Leaf size={18} />
              </span>
              <span className="font-serif text-xl font-semibold">L'olivier</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-bone/60">
              Parapharmacie botanique. L'excellence naturelle au service de votre santé, 7j/7 et 24h/24.
            </p>
            <div className="mt-5 flex gap-2">
              <a href={c.instagram} target="_blank" rel="noreferrer" data-testid="footer-instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-bone/20 transition-colors hover:border-terra hover:text-terra" aria-label="Instagram">
                <Instagram size={16} />
              </a>
              {c.facebook && (
                <a href={c.facebook} target="_blank" rel="noreferrer" data-testid="footer-facebook"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-bone/20 transition-colors hover:border-terra hover:text-terra" aria-label="Facebook">
                  <Facebook size={16} />
                </a>
              )}
              {c.tiktok && (
                <a href={c.tiktok} target="_blank" rel="noreferrer" data-testid="footer-tiktok"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-bone/20 transition-colors hover:border-terra hover:text-terra" aria-label="TikTok">
                  <Music2 size={16} />
                </a>
              )}
              {c.whatsapp && (
                <a href={c.whatsapp} target="_blank" rel="noreferrer" data-testid="footer-whatsapp"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-bone/20 transition-colors hover:border-terra hover:text-terra" aria-label="WhatsApp">
                  <MessageCircle size={16} />
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 className="badge-mono text-bone/40">Catégories</h4>
            <ul className="mt-4 space-y-2.5">
              {CATEGORIES.map((cat) => (
                <li key={cat}>
                  <Link to={`/catalogue?categorie=${encodeURIComponent(cat)}`} data-testid={`footer-cat-${cat.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                    className="text-sm text-bone/70 transition-colors hover:text-bone">
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="badge-mono text-bone/40">Programme Fidélité</h4>
            <ul className="mt-4 space-y-2.5">
              <li><Link to="/fidelite" data-testid="footer-fidelite" className="text-sm text-bone/70 hover:text-bone">Comment ça marche</Link></li>
              <li><Link to="/fidelite" data-testid="footer-bronze" className="text-sm text-bone/70 hover:text-bone"><span className="text-bronze">●</span> Bronze</Link></li>
              <li><Link to="/fidelite" data-testid="footer-silver" className="text-sm text-bone/70 hover:text-bone"><span className="text-silver">●</span> Silver</Link></li>
              <li><Link to="/fidelite" data-testid="footer-gold" className="text-sm text-bone/70 hover:text-bone"><span className="text-gold">●</span> Gold</Link></li>
              <li><Link to="/compte" data-testid="footer-mes-points" className="text-sm text-bone/70 hover:text-bone">Mes points</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="badge-mono text-bone/40">Contact & Direct</h4>
            <ul className="mt-4 space-y-3">
              {c.phones.map((p) => (
                <li key={p}>
                  <a href={`tel:${p}`} data-testid={`footer-phone-${p}`} className="flex items-center gap-2 text-sm text-bone/70 hover:text-bone">
                    <Phone size={14} className="text-terra" /> <span className="font-mono">{p}</span>
                  </a>
                </li>
              ))}
              <li>
                <a href={c.maps_url} target="_blank" rel="noreferrer" data-testid="footer-maps"
                  className="flex items-center gap-2 text-sm text-bone/70 hover:text-bone">
                  <MapPin size={14} className="text-terra" /> {c.address_label}
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-bone/70">
                <Clock size={14} className="text-terra" /> {c.hours}
              </li>
            </ul>
          </div>

          <div>
            <h4 className="badge-mono text-bone/40">Informations</h4>
            <ul className="mt-4 space-y-2.5">
              <li><Link to="/catalogue" data-testid="footer-catalogue" className="text-sm text-bone/70 hover:text-bone">Catalogue</Link></li>
              <li><Link to="/favoris" data-testid="footer-favoris" className="text-sm text-bone/70 hover:text-bone">Mes favoris</Link></li>
              <li><Link to="/panier" data-testid="footer-panier" className="text-sm text-bone/70 hover:text-bone">Panier</Link></li>
              <li className="text-sm text-bone/50">Paiement à la livraison</li>
              <li className="text-sm text-bone/50">Produits 100% certifiés</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-bone/10 pt-8 sm:flex-row">
          <p className="text-xs text-bone/40" data-testid="footer-copyright">© 2026 L'olivier — Parapharmacie. Tous droits réservés.</p>
          <p className="flex items-center gap-2 text-xs text-bone/40">
            <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-green-400" />
            Ouvert maintenant — {c.hours}
          </p>
        </div>
      </div>
    </footer>
  );
}
