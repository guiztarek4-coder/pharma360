import { Link } from "react-router-dom";
import { Compass, ArrowLeft } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

export default function VirtualTour() {
  const { settings } = useSettings();
  const url = settings.virtual_tour_url;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10" data-testid="virtual-tour-page">
      <div className="flex items-center gap-3 mb-6">
        <Compass className="w-7 h-7 text-mint-600" />
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-dark">Visite virtuelle 360°</h1>
      </div>
      {url ? (
        <div className="rounded-3xl overflow-hidden border border-slate-200/80 bg-black aspect-video" data-testid="virtual-tour-frame">
          <iframe title="Visite virtuelle 360°" src={url} width="100%" height="100%" allowFullScreen allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer" style={{ border: 0 }} />
        </div>
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-mint-200 bg-mint-50/40 p-12 text-center" data-testid="virtual-tour-placeholder">
          <Compass className="w-16 h-16 text-mint-300 mx-auto mb-4" />
          <h2 className="font-display font-bold text-lg text-slate-dark mb-2">Visite virtuelle bientôt disponible</h2>
          <p className="text-slate-500 max-w-md mx-auto">La visite 360° de notre boutique sera bientôt en ligne. Revenez très prochainement pour explorer la pharmacie comme si vous y étiez !</p>
          <Link to="/contact" className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full bg-mint-600 text-white font-semibold text-sm hover:bg-mint-700"><ArrowLeft className="w-4 h-4" /> Retour au contact</Link>
        </div>
      )}
    </div>
  );
}
