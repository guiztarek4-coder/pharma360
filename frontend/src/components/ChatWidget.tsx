import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Pressable, Modal, TextInput, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, font } from "@/src/theme/theme";
import { Txt, Button } from "@/src/components/ui";
import { api } from "@/src/lib/api";
import { storage } from "@/src/utils/storage";
import { useAuth } from "@/src/store/auth";

const CHAT_KEY = "pharma_chat_id";

type Msg = { id?: string; text: string; from?: string; sender?: string; is_admin?: boolean; created_at?: string };

export function ChatWidget() {
  const { colors, settings } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [starting, setStarting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<string>(CHAT_KEY, "");
      if (saved) setChatId(saved);
    })();
  }, []);

  useEffect(() => {
    if (user) {
      setName(`${user.first_name} ${user.last_name}`.trim());
      setEmail(user.email || "");
    }
  }, [user]);

  const loadMessages = useCallback(async (id: string) => {
    try {
      const res = await api.get(`/chat/${id}/messages`);
      setMessages(Array.isArray(res) ? res : res?.messages || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (open && chatId) {
      loadMessages(chatId);
      const t = setInterval(() => loadMessages(chatId), 5000);
      return () => clearInterval(t);
    }
  }, [open, chatId, loadMessages]);

  const start = async () => {
    if (!name.trim() || !email.trim()) return;
    setStarting(true);
    try {
      const res = await api.post("/chat/start", { name: name.trim(), email: email.trim() });
      const id = res?.id;
      if (id) {
        setChatId(id);
        await storage.setItem(CHAT_KEY, id);
        setMessages([]);
      }
    } catch {}
    finally {
      setStarting(false);
    }
  };

  const send = async () => {
    const t = text.trim();
    if (!t || !chatId) return;
    setText("");
    setMessages((m) => [...m, { text: t, sender: "client", is_admin: false }]);
    try {
      await api.post(`/chat/${chatId}/message`, { text: t });
      await loadMessages(chatId);
    } catch {}
  };

  // Hide the floating button on non-tab screens to avoid overlapping modals/CTAs
  const showButton = pathname === "/" || pathname === "/catalogue" || pathname === "/compte" || pathname === "/panier";

  const quickReplies: string[] = settings?.chat_quick_replies || [];

  return (
    <>
      {showButton ? (
        <Pressable
          testID="chat-fab"
          onPress={() => setOpen(true)}
          style={{ position: "absolute", right: 16, bottom: insets.bottom + 84, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", ...(Platform_shadow as any) }}
        >
          <Feather name="message-circle" size={26} color="#fff" />
        </Pressable>
      ) : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} />
          <View style={{ height: "78%", backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" }}>
            {/* header */}
            <View style={{ padding: 16, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" }}>
                <Feather name="headphones" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Txt family="display" weight={700} size={16} color="#fff">
                  Service Client
                </Txt>
                <Txt size={12} color="rgba(255,255,255,0.9)">
                  Pharma360 · réponse rapide
                </Txt>
              </View>
              <Pressable testID="chat-close" onPress={() => setOpen(false)} hitSlop={10}>
                <Feather name="x" size={24} color="#fff" />
              </Pressable>
            </View>

            {!chatId ? (
              <View style={{ padding: 20, gap: 14 }}>
                <Txt size={14} color={colors.textMuted}>
                  Démarrez une conversation avec notre équipe.
                </Txt>
                <View style={{ height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: "center", paddingHorizontal: 14 }}>
                  <TextInput testID="chat-name" value={name} onChangeText={setName} placeholder="Votre nom" placeholderTextColor={colors.textLight} style={{ fontFamily: font("text", 400), fontSize: 15, color: colors.text }} />
                </View>
                <View style={{ height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: "center", paddingHorizontal: 14 }}>
                  <TextInput testID="chat-email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Votre email" placeholderTextColor={colors.textLight} style={{ fontFamily: font("text", 400), fontSize: 15, color: colors.text }} />
                </View>
                <Button testID="chat-start" title="Démarrer la discussion" loading={starting} onPress={start} />
              </View>
            ) : (
              <>
                <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
                  {messages.length === 0 ? (
                    <Txt size={13} color={colors.textLight} center style={{ marginTop: 20 }}>
                      Envoyez votre message, nous vous répondrons ici.
                    </Txt>
                  ) : null}
                  {messages.map((m, i) => {
                    const mine = m.is_admin === false || m.sender === "client" || m.from === "client";
                    return (
                      <View key={i} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%", backgroundColor: mine ? colors.primary : colors.surface, borderWidth: mine ? 0 : 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 }}>
                        <Txt size={14} color={mine ? "#fff" : colors.text}>
                          {m.text}
                        </Txt>
                      </View>
                    );
                  })}
                </ScrollView>
                {quickReplies.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44 }} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, alignItems: "center" }}>
                    {quickReplies.map((q, i) => (
                      <Pressable key={i} onPress={() => setText(q)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.tintSoft }}>
                        <Txt size={12} color={colors.primary} weight={600}>
                          {q}
                        </Txt>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, paddingBottom: insets.bottom + 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.surface }}>
                  <TextInput testID="chat-input" value={text} onChangeText={setText} placeholder="Écrire un message…" placeholderTextColor={colors.textLight} style={{ flex: 1, fontFamily: font("text", 400), fontSize: 15, color: colors.text, maxHeight: 100 }} multiline />
                  <Pressable testID="chat-send" onPress={send} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                    <Feather name="send" size={20} color="#fff" />
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const Platform_shadow = {
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
};
