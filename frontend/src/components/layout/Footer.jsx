import { Link } from "react-router-dom";
import { Leaf, ShieldCheck, PackageCheck, Headphones, Truck, Facebook, Instagram, MapPin, Phone, Mail, Clock } from "lucide-react";
import { SITE, CATEGORIES } from "@/lib/site";

const trust = [
  { icon: ShieldCheck, title: "100% Originaux", desc: "Produits authentiques certifiés" },
  { icon: PackageCheck, title: "Toujours en stock", desc: "Large gamme disponible" },
  { icon: Headphones, title: "Service client", desc: "Conseils de nos experts 7j/7" },
  { icon: Truck, title: "Livraison rapide", desc: "58 wilayas · 24-48h" },
];

export default function Footer() {
  return (
    <footer className="mt-16 bg-slate-dark text-slate-300" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-10 border-b border-white/10">
          {trust.map((t) => (
            <div key={t.title} className="flex items-start gap-3">
              <span className="w-11 h-11 rounded-xl bg-mint-600/20 grid place-items-center shrink-0">
                <t.icon className="w-5 h-5 text-mint-300" />
              </span>
              <div>
                <div className="font-display font-bold text-white text-sm">{t.title}</div>
                <div className="text-xs text-slate-400">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-lg bg-mint-600 grid place-items-center"><Leaf className="w-4 h-4 text-white" /></span>
              <span className="font-display font-extrabold text-lg text-white">Pharma<span className="text-mint-400">360</span></span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{SITE.tagline}. Soins, cosmétiques authentiques et bien-être livrés partout en Algérie.</p>
            <div className="flex gap-2 mt-4">
              <a href={SITE.socials.facebook} className="w-9 h-9 rounded-lg bg-white/5 hover:bg-mint-600 grid place-items-center transition-colors" data-testid="social-facebook"><Facebook className="w-4 h-4" /></a>
              <a href={SITE.socials.instagram} className="w-9 h-9 rounded-lg bg-white/5 hover:bg-mint-600 grid place-items-center transition-colors" data-testid="social-instagram"><Instagram className="w-4 h-4" /></a>
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold text-white mb-4 text-sm">Catégories</h4>
            <ul className="space-y-2 text-sm">
              {CATEGORIES.slice(0, 6).map((c) => (
                <li key={c.id}><Link to={`/categorie/${c.id}`} className="text-slate-400 hover:text-mint-300 transition-colors">{c.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-white mb-4 text-sm">Informations</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/marques" className="text-slate-400 hover:text-mint-300">Nos marques</Link></li>
              <li><Link to="/blog" className="text-slate-400 hover:text-mint-300">Blog & Conseils</Link></li>
              <li><Link to="/contact" className="text-slate-400 hover:text-mint-300">Contact</Link></li>
              <li><Link to="/confidentialite" className="text-slate-400 hover:text-mint-300">Confidentialité</Link></li>
              <li><Link to="/cgv" className="text-slate-400 hover:text-mint-300">CGV</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-white mb-4 text-sm">Contact</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-2"><MapPin className="w-4 h-4 text-mint-400 mt-0.5 shrink-0" />{SITE.address}</li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-mint-400" /><a href={`tel:${SITE.phoneLink}`}>{SITE.phone}</a></li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-mint-400" />{SITE.email}</li>
              <li className="flex items-center gap-2"><Clock className="w-4 h-4 text-mint-400" />{SITE.horaires}</li>
            </ul>
          </div>
        </div>

        <div className="py-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Pharma360. Tous droits réservés.</p>
          <p>Paiement à la livraison · Carte CIB / Edahabia</p>
        </div>
      </div>
    </footer>
  );
}
