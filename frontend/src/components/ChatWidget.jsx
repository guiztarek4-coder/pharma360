import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Leaf } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const FAQ = [
  { q: "Quels sont vos horaires ?", a: "Nous sommes ouverts 7j/7, 24h/24. Une équipe de pharmaciens est toujours disponible." },
  { q: "Livrez-vous à domicile ?", a: "Oui, livraison express disponible. Paiement à la livraison. Appelez le 0770777685 pour les détails." },
  { q: "Comment fonctionne la fidélité ?", a: "1 point = 100 DA d'achat, crédités à la livraison. Bronze dès l'inscription, Silver à 500 pts, Gold à 1500 pts, avec cadeaux et offres exclusives à chaque statut." },
];

function guestId() {
  let id = localStorage.getItem("lolivier_guest");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("lolivier_guest", id);
  }
  return id;
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const isAdmin = user && user.role === "admin";

  useEffect(() => {
    if (!open || conv || isAdmin) return;
    (async () => {
      try {
        const { data } = await api.post("/chat/conversations", { guest_id: guestId() });
        setConv(data);
        const msgs = await api.get(`/chat/conversations/${data.id}/messages`);
        setMessages(msgs.data);
      } catch {}
    })();
  }, [open, conv, isAdmin]);

  useEffect(() => {
    if (!open || !conv) return;
    const t = setInterval(async () => {
      try {
        const { data } = await api.get(`/chat/conversations/${conv.id}/messages`);
        setMessages((prev) => {
          const locals = prev.filter((m) => m.local);
          return [...data, ...locals];
        });
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [open, conv]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    if (!input.trim() || !conv || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/chat/conversations/${conv.id}/messages`, { content: input.trim() });
      setMessages((prev) => [...prev, data]);
      setInput("");
    } catch {} finally {
      setSending(false);
    }
  };

  const askFaq = (item) => {
    setMessages((prev) => [
      ...prev,
      { id: `lq-${Date.now()}`, sender: "client", content: item.q, local: true },
      { id: `la-${Date.now()}`, sender: "bot", content: item.a, local: true },
    ]);
  };

  if (isAdmin) return null;

  return (
    <>
      <motion.button
        onClick={() => setOpen(!open)}
        data-testid="chat-open-button"
        aria-label="Chat en direct"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-bone shadow-[0_16px_40px_-10px_rgba(24,28,20,0.5)] transition-transform hover:scale-105"
        whileTap={{ scale: 0.92 }}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && <span className="pulse-dot absolute right-1 top-1 h-3 w-3 rounded-full bg-green-400 ring-2 ring-bone" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            data-testid="chat-panel"
            className="fixed bottom-24 right-4 z-50 flex h-[480px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-3xl border bg-white shadow-2xl sm:right-6"
          >
            <div className="flex items-center gap-3 bg-brand px-5 py-4 text-bone">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-bone/15">
                <Leaf size={16} />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">Conseil L'olivier</p>
                <p className="flex items-center gap-1.5 text-[11px] text-bone/70">
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-green-400" /> En ligne — répond 24h/24
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-bone p-4" data-testid="chat-messages">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "client" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.sender === "client"
                      ? "rounded-br-sm bg-brand text-bone"
                      : "rounded-bl-sm border bg-white text-obsidian"
                  }`}>
                    {m.sender === "admin" && <p className="badge-mono mb-1 text-[8px] text-terra">Pharmacien L'olivier</p>}
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="border-t bg-white p-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {FAQ.map((f) => (
                  <button key={f.q} onClick={() => askFaq(f)} data-testid={`chat-faq-${f.q.slice(0, 12).replace(/[^a-z]+/gi, "-").toLowerCase()}`}
                    className="rounded-full border border-brand/30 px-2.5 py-1 text-[10px] font-medium text-brand transition-colors hover:bg-brand-pale">
                    {f.q}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Écrivez votre message…"
                  data-testid="chat-input"
                  className="input-field flex-1 !rounded-full !py-2.5 text-sm"
                />
                <button onClick={send} disabled={sending || !input.trim()} data-testid="chat-send-button" aria-label="Envoyer"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-bone transition-colors hover:bg-brand-hover disabled:opacity-40">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
