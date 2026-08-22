import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";

export default function CmsPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setPage(null); setNotFound(false);
    api.get(`/pages/${slug}`).then((r) => setPage(r.data)).catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center" data-testid="cms-page-notfound">
        <h1 className="font-display font-extrabold text-2xl mb-3">Page introuvable</h1>
        <p className="text-slate-500 mb-6">Cette page n'existe pas ou n'est pas disponible.</p>
        <Link to="/" className="px-6 py-3 rounded-full bg-mint-600 text-white font-semibold">Retour à l'accueil</Link>
      </div>
    );
  }
  if (!page) return <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center text-slate-400">Chargement…</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12" data-testid="cms-page">
      <h1 className="font-display font-extrabold text-3xl mb-6" data-testid="cms-page-title">{page.title}</h1>
      <div className="text-slate-600 leading-relaxed whitespace-pre-line" data-testid="cms-page-content">{page.content}</div>
    </div>
  );
}
