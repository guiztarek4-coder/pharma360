import { useEffect, useRef, useState } from "react";
import { Send, UserRound } from "lucide-react";
import { api } from "@/lib/api";

export default function AdminChat() {
  const [convs, setConvs] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  const loadConvs = () => api.get("/admin/chat/conversations").then((r) => setConvs(r.data)).catch(() => {});

  useEffect(() => {
    loadConvs();
    const t = setInterval(loadConvs, 6000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!active) return;
    const loadMsgs = () => api.get(`/chat/conversations/${active.id}/messages`).then((r) => setMessages(r.data)).catch(() => {});
    loadMsgs();
    const t = setInterval(loadMsgs, 4000);
    return () => clearInterval(t);
  }, [active]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || !active) return;
    const { data } = await api.post(`/chat/conversations/${active.id}/messages`, { content: input.trim() });
    setMessages((m) => [...m, data]);
    setInput("");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3" data-testid="admin-chat">
      <div className="overflow-hidden rounded-3xl border bg-white lg:col-span-1">
        <p className="border-b p-4 badge-mono text-stone2">Conversations ({convs.length})</p>
        <div className="max-h-[480px] overflow-y-auto" data-testid="admin-conversations">
          {convs.length === 0 && <p className="p-6 text-sm text-stone2">Aucune conversation pour le moment.</p>}
          {convs.map((c) => (
            <button key={c.id} onClick={() => setActive(c)} data-testid={`admin-conv-${c.id}`}
              className={`flex w-full items-start gap-3 border-b p-4 text-left transition-colors last:border-0 hover:bg-sand/60 ${active?.id === c.id ? "bg-brand-pale" : ""}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-bone">
                {c.name?.charAt(0)?.toUpperCase() || <UserRound size={14} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-obsidian">{c.name}</span>
                <span className="block truncate text-xs text-stone2">{c.last_message}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex h-[540px] flex-col overflow-hidden rounded-3xl border bg-white lg:col-span-2" data-testid="admin-chat-thread">
        {!active ? (
          <div className="flex flex-1 items-center justify-center text-sm text-stone2" data-testid="admin-chat-empty">
            Sélectionnez une conversation pour répondre.
          </div>
        ) : (
          <>
            <div className="border-b bg-brand p-4 text-bone">
              <p className="text-sm font-semibold">{active.name}</p>
              <p className="text-[11px] text-bone/60">{active.user_id ? "Client membre" : "Visiteur"}</p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-bone p-4" data-testid="admin-chat-messages">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.sender === "admin" ? "rounded-br-sm bg-brand text-bone"
                    : m.sender === "bot" ? "rounded-bl-sm border border-dashed bg-white/60 text-stone2 italic"
                    : "rounded-bl-sm border bg-white text-obsidian"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="flex items-center gap-2 border-t bg-white p-3">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={`Répondre à ${active.name}…`} data-testid="admin-chat-input" className="input-field flex-1 !rounded-full !py-2.5 text-sm" />
              <button onClick={send} disabled={!input.trim()} data-testid="admin-chat-send" aria-label="Envoyer"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-bone hover:bg-brand-hover disabled:opacity-40">
                <Send size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
