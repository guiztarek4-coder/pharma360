import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api, { mediaUrl } from "@/lib/api";

export function Blog() {
  const [posts, setPosts] = useState([]);
  useEffect(() => { api.get("/blog").then((r) => setPosts(r.data)); }, []);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display font-extrabold text-3xl text-slate-dark mb-2">Blog Santé & Conseils Beauté</h1>
      <p className="text-slate-500 mb-8">Astuces et guides rédigés par nos spécialistes pour prendre soin de vous au quotidien.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((p) => (
          <Link key={p.id} to={`/blog/${p.id}`} data-testid={`blog-${p.id}`} className="group bg-white rounded-2xl overflow-hidden border border-slate-200/80 hover:shadow-xl transition-all">
            <div className="aspect-[16/10] overflow-hidden bg-mint-50"><img src={mediaUrl(p.image)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>
            <div className="p-5">
              <div className="text-xs text-mint-600 font-mono-label mb-2">{p.author} · {new Date(p.created_at).toLocaleDateString("fr-FR")}</div>
              <h3 className="font-display font-bold text-lg leading-snug line-clamp-2 group-hover:text-mint-700 transition-colors">{p.title}</h3>
              <p className="text-sm text-slate-500 mt-2 line-clamp-3">{p.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function BlogPost() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  useEffect(() => { window.scrollTo(0, 0); api.get(`/blog/${id}`).then((r) => setPost(r.data)); }, [id]);
  if (!post) return <div className="py-24 text-center text-slate-400">Chargement…</div>;
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/blog" className="inline-flex items-center gap-2 text-mint-700 text-sm font-semibold mb-6"><ArrowLeft className="w-4 h-4" /> Retour au blog</Link>
      <div className="text-xs text-mint-600 font-mono-label mb-3">{post.author} · {new Date(post.created_at).toLocaleDateString("fr-FR")}</div>
      <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-dark leading-tight mb-6">{post.title}</h1>
      <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-mint-50 mb-8"><img src={mediaUrl(post.image)} alt={post.title} className="w-full h-full object-cover" /></div>
      <p className="text-lg text-slate-600 font-medium mb-4">{post.excerpt}</p>
      <div className="text-slate-700 leading-relaxed whitespace-pre-line">{post.content}</div>
    </article>
  );
}
