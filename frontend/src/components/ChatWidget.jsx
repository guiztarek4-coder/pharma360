import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const CONV_KEY = "pharma360_chat_conv";

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [convId, setConvId] = useState(() => localStorage.getItem(CONV_KEY) || "");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [form, setForm] = useState({ name: "", email: "" });
  const [starting, setStarting] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const loadMessages = async (id) => {
    try { const { data } = await api.get(`/chat/${id}/messages`); setMessages(data); }
    catch { /* conversation gone */ localStorage.removeItem(CONV_KEY); setConvId(""); }
  };

  useEffect(() => {
    if (open && convId) {
      loadMessages(convId);
      pollRef.current = setInterval(() => loadMessages(convId), 4000);
      return () => clearInterval(pollRef.current);
    }
  }, [open, convId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const start = async () => {
    setStarting(true);
    try {
      const { data } = await api.post("/chat/start", { name: form.name, email: form.email });
      localStorage.setItem(CONV_KEY, data.id); setConvId(data.id); setMessages([]);
    } catch {} finally { setStarting(false); }
  };

  const send = async () => {
    const t = text.trim(); if (!t || !convId) return;
    setText("");
    setMessages((m) => [...m, { id: `tmp${Date.now()}`, sender: "user", text: t }]);
    try { await api.post(`/chat/${convId}/message`, { text: t }); await loadMessages(convId); } catch {}
  };

  const needsStart = !convId && !user;

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} data-testid="chat-open-btn"
          className="fixed bottom-5 right-5 z-[9998] w-14 h-14 rounded-full bg-mint-600 hover:bg-mint-700 text-white shadow-xl shadow-mint-600/40 grid place-items-center transition-transform hover:scale-105">
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-[9999] w-[92vw] max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden" data-testid="chat-window" style={{ height: "min(70vh, 520px)" }}>
          <div className="bg-mint-600 text-white px-5 py-4 flex items-center justify-between">
            <div>
              <div className="font-display font-bold">Service client Pharma360</div>
              <div className="text-xs text-mint-100">Nous répondons rapidement</div>
            </div>
            <button onClick={() => setOpen(false)} data-testid="chat-close-btn" className="hover:bg-white/15 rounded-full p-1"><X className="w-5 h-5" /></button>
          </div>

          {needsStart ? (
            <div className="flex-1 p-5 flex flex-col justify-center gap-3" data-testid="chat-start-form">
              <p className="text-sm text-slate-600">Bonjour ! Laissez-nous vos coordonnées pour démarrer la discussion.</p>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Votre nom" data-testid="chat-name" className="w-full px-4 py-2.5 rounded-xl border border-mint-200 outline-none focus:ring-2 focus:ring-mint-500 text-sm" />
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email (optionnel)" data-testid="chat-email" className="w-full px-4 py-2.5 rounded-xl border border-mint-200 outline-none focus:ring-2 focus:ring-mint-500 text-sm" />
              <button onClick={start} disabled={starting || !form.name.trim()} data-testid="chat-start-btn" className="py-2.5 rounded-full bg-mint-600 text-white font-semibold text-sm disabled:opacity-50">{starting ? "…" : "Démarrer la discussion"}</button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto p-4 space-y-3 bg-mint-50/30" data-testid="chat-messages">
                {(!convId && user) && (
                  <div className="text-center">
                    <button onClick={start} disabled={starting} data-testid="chat-start-btn" className="px-4 py-2 rounded-full bg-mint-600 text-white font-semibold text-sm">{starting ? "…" : "Démarrer la discussion"}</button>
                  </div>
                )}
                {messages.length === 0 && convId && <p className="text-center text-sm text-slate-400 mt-6">Envoyez votre premier message !</p>}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${m.sender === "user" ? "bg-mint-600 text-white rounded-br-sm" : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"}`}>{m.text}</div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              {convId && (
                <div className="p-3 border-t border-slate-100 flex items-center gap-2">
                  <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Écrivez un message…" data-testid="chat-input" className="flex-1 px-4 py-2.5 rounded-full border border-mint-200 outline-none focus:ring-2 focus:ring-mint-500 text-sm" />
                  <button onClick={send} data-testid="chat-send-btn" className="w-10 h-10 rounded-full bg-mint-600 text-white grid place-items-center shrink-0"><Send className="w-4 h-4" /></button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
