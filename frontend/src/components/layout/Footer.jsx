import { Link } from "react-router-dom";
import { Leaf, ShieldCheck, PackageCheck, Headphones, Truck, Facebook, Instagram, MapPin, Phone, Mail, Clock, Compass } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

const trust = [
  { icon: ShieldCheck, title: "100% Originaux", desc: "Produits authentiques certifiés" },
  { icon: PackageCheck, title: "Toujours en stock", desc: "Large gamme disponible" },
  { icon: Headphones, title: "Service client", desc: "Conseils de nos experts 7j/7" },
  { icon: Truck, title: "Livraison rapide", desc: "Toutes les wilayas · 24-48h" },
];

export const mapsHref = (settings) =>
  settings.maps_link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address || "")}`;

const TikTokIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M16.6 5.82a4.28 4.28 0 0 1-1.01-2.62V3h-3.1v12.4a2.6 2.6 0 1 1-1.86-2.5v-3.2a5.7 5.7 0 1 0 4.96 5.66V9.01a7.3 7.3 0 0 0 4.28 1.37V7.28a4.28 4.28 0 0 1-3.27-1.46z" />
  </svg>
);
const WhatsAppIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5l-1.42 5.2 5.32-1.4a9.9 9.9 0 0 0 4.72 1.2h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2zm5.84 14.06c-.24.68-1.4 1.32-1.94 1.36-.5.05-.98.24-3.32-.7-2.8-1.1-4.6-3.96-4.74-4.14-.14-.18-1.14-1.52-1.14-2.9 0-1.38.72-2.06.98-2.34.24-.28.54-.34.72-.34.18 0 .36 0 .52.02.16.02.4-.06.62.48.24.56.82 1.94.9 2.08.08.14.12.3.02.48-.1.18-.14.3-.28.46-.14.16-.3.36-.42.48-.14.14-.28.3-.12.58.16.28.72 1.18 1.54 1.92 1.06.94 1.94 1.24 2.22 1.38.28.14.44.12.6-.08.16-.18.7-.82.88-1.1.18-.28.36-.24.62-.14.26.1 1.64.78 1.92.92.28.14.46.2.52.32.06.12.06.68-.18 1.36z" />
  </svg>
);

function FooterLink({ link }) {
  if (!link.enabled) return null;
  const t = link.target || "#";
  const isInternal = t.startsWith("/");
  const cls = "text-slate-400 hover:text-mint-300 transition-colors";
  const testid = `footer-link-${link.id}`;
  return isInternal
    ? <li><Link to={t} className={cls} data-testid={testid}>{link.label}</Link></li>
    : <li><a href={t} target="_blank" rel="noopener noreferrer" className={cls} data-testid={testid}>{link.label}</a></li>;
}

export default function Footer() {
  const { settings } = useSettings();
  const news = settings.footer_news_links || [];
  const help = settings.footer_help_links || [];
  const waUrl = settings.whatsapp_url || (settings.whatsapp_number ? `https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, "")}` : "#");

  const socials = [
    { key: "facebook", Icon: Facebook, href: settings.facebook, label: "Facebook" },
    { key: "instagram", Icon: Instagram, href: settings.instagram, label: "Instagram" },
    { key: "tiktok", Icon: TikTokIcon, href: settings.tiktok, label: "TikTok" },
    { key: "whatsapp", Icon: WhatsAppIcon, href: waUrl, label: "WhatsApp" },
  ];

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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 py-12">
          {/* Col 1 — À propos */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-lg bg-mint-600 grid place-items-center"><Leaf className="w-4 h-4 text-white" /></span>
              <span className="font-display font-extrabold text-lg text-white">Pharma<span className="text-mint-400">360</span></span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed" data-testid="footer-about">{settings.footer_about}</p>
          </div>

          {/* Col 2 — Actualités */}
          <div>
            <h4 className="font-display font-bold text-white mb-4 text-sm">Actualités</h4>
            <ul className="space-y-2 text-sm" data-testid="footer-news-col">
              {news.map((l) => <FooterLink key={l.id} link={l} />)}
            </ul>
          </div>

          {/* Col 3 — Aide */}
          <div>
            <h4 className="font-display font-bold text-white mb-4 text-sm">Aide</h4>
            <ul className="space-y-2 text-sm" data-testid="footer-help-col">
              {help.map((l) => <FooterLink key={l.id} link={l} />)}
            </ul>
          </div>

          {/* Col 4 — Nous suivre */}
          <div>
            <h4 className="font-display font-bold text-white mb-4 text-sm">Nous suivre</h4>
            <div className="flex flex-wrap gap-2" data-testid="footer-socials">
              {socials.map(({ key, Icon, href, label }) => (
                <a key={key} href={href || "#"} target="_blank" rel="noopener noreferrer" aria-label={label}
                  data-testid={`social-${key}`}
                  className="w-10 h-10 rounded-lg bg-white/5 hover:bg-mint-600 grid place-items-center transition-colors">
                  <Icon className="w-4.5 h-4.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Col 5 — Contactez-nous */}
          <div>
            <h4 className="font-display font-bold text-white mb-4 text-sm">Contactez-nous</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-2"><MapPin className="w-4 h-4 text-mint-400 mt-0.5 shrink-0" /><a href={mapsHref(settings)} target="_blank" rel="noopener noreferrer" data-testid="footer-address-map" className="hover:text-mint-300 transition-colors">{settings.address}</a></li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-mint-400 shrink-0" /><a href={`tel:${settings.phone_link}`}>{settings.phone}</a></li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-mint-400 shrink-0" />{settings.email}</li>
              <li className="flex items-center gap-2"><Clock className="w-4 h-4 text-mint-400 shrink-0" />{settings.horaires}</li>
              <li className="flex items-start gap-2"><Compass className="w-4 h-4 text-mint-400 mt-0.5 shrink-0" /><Link to="/visite-360" data-testid="footer-tour-link" className="hover:text-mint-300 transition-colors">Visite virtuelle 360° de la boutique</Link></li>
            </ul>
          </div>
        </div>

        {settings.app_download_enabled && (
          <div className="py-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-5" data-testid="footer-app-download">
            <div className="text-center sm:text-left">
              <h4 className="font-display font-bold text-white text-lg">Téléchargez notre application Pharma360</h4>
              <p className="text-sm text-slate-400 mt-1">Commandez encore plus vite depuis votre mobile.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a href={settings.app_store_url || "#"} target="_blank" rel="noopener noreferrer" data-testid="app-store-btn"
                className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 transition-colors">
                <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor"><path d="M16.5 1.9c0 1.1-.4 2.1-1.2 3-.9.9-1.9 1.5-3 1.4-.1-1.1.4-2.2 1.2-3 .8-.9 2-1.5 3-1.4zM20.6 17c-.5 1.2-.8 1.7-1.5 2.8-1 1.5-2.4 3.4-4.1 3.4-1.5 0-1.9-1-4-1-2 0-2.5 1-4 1-1.7 0-3-1.7-4-3.2-2.8-4.3-3.1-9.3-1.4-12 1.2-1.9 3.1-3 4.9-3 1.8 0 3 1 4.5 1 1.5 0 2.3-1 4.4-1 1.6 0 3.3.9 4.5 2.4-4 2.2-3.3 7.9.2 9.6z"/></svg>
                <span className="text-left"><span className="block text-[10px] leading-none">Télécharger dans</span><span className="block font-display font-bold text-base leading-tight">App Store</span></span>
              </a>
              <a href={settings.play_store_url || "#"} target="_blank" rel="noopener noreferrer" data-testid="play-store-btn"
                className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 transition-colors">
                <svg viewBox="0 0 24 24" className="w-7 h-7"><path fill="#00D0FF" d="M3.6 2.3c-.3.3-.5.7-.5 1.3v16.8c0 .6.2 1 .5 1.3l.1.1L13 12.6v-.2L3.7 2.2z"/><path fill="#00F076" d="M16.3 15.9l-3.3-3.3v-.2l3.3-3.3.1.1 3.9 2.2c1.1.6 1.1 1.7 0 2.4l-3.9 2.2z"/><path fill="#FF3A44" d="M16.4 15.8L13 12.4 3.6 21.8c.4.4 1 .4 1.7.1l11.1-6.1"/><path fill="#FFC400" d="M16.4 9L5.3 2.9c-.7-.4-1.3-.3-1.7.1L13 12.4z"/></svg>
                <span className="text-left"><span className="block text-[10px] leading-none">Disponible sur</span><span className="block font-display font-bold text-base leading-tight">Google Play</span></span>
              </a>
            </div>
          </div>
        )}

        <div className="py-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {settings.brand_name}. Tous droits réservés.</p>
          <p>Paiement à la livraison · BaridiMob</p>
        </div>
      </div>
    </footer>
  );
}
