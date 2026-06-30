import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app/AppShell";
import { toast } from "sonner";
import { Send, Lock, DollarSign, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesPage,
});

type Msg = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  media_url: string | null;
  media_price: number;
  is_read: boolean;
  created_at: string;
};

function MessagesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activePeer, setActivePeer] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaPrice, setMediaPrice] = useState(0);
  const [showMedia, setShowMedia] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // All messages involving the user
  const { data: allMsgs } = useQuery({
    queryKey: ["msgs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: true });
      return (data ?? []) as Msg[];
    },
  });

  // Conversation list = unique peers
  const conversations = useMemo(() => {
    if (!user || !allMsgs) return [];
    const map = new Map<string, { peer: string; last: Msg }>();
    for (const m of allMsgs) {
      const peer = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      map.set(peer, { peer, last: m });
    }
    return Array.from(map.values()).sort((a, b) => +new Date(b.last.created_at) - +new Date(a.last.created_at));
  }, [allMsgs, user]);

  const peerIds = conversations.map((c) => c.peer);
  const { data: peerProfiles } = useQuery({
    queryKey: ["peer-profiles", peerIds.join(",")],
    enabled: peerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", peerIds);
      return data ?? [];
    },
  });

  const peerMap = new Map((peerProfiles ?? []).map((p: any) => [p.id, p]));
  const thread = useMemo(() => (allMsgs ?? []).filter((m) =>
    activePeer && (
      (m.sender_id === user?.id && m.receiver_id === activePeer) ||
      (m.sender_id === activePeer && m.receiver_id === user?.id)
    )
  ), [allMsgs, activePeer, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [thread.length, activePeer]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Msg;
        if (m.sender_id === user.id || m.receiver_id === user.id) {
          qc.invalidateQueries({ queryKey: ["msgs", user.id] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  async function send() {
    if (!user || !activePeer) return;
    if (!text.trim() && !mediaUrl.trim()) return;
    const payload = {
      sender_id: user.id,
      receiver_id: activePeer,
      content: text.trim() || null,
      media_url: mediaUrl.trim() || null,
      media_price: mediaUrl.trim() ? mediaPrice : 0,
    };
    const { error } = await supabase.from("messages").insert(payload);
    if (error) { toast.error(error.message); return; }
    setText(""); setMediaUrl(""); setMediaPrice(0); setShowMedia(false);
    qc.invalidateQueries({ queryKey: ["msgs", user.id] });
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Mensagens</h1>
      <div className="mt-6 grid h-[70vh] gap-4 overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[300px_1fr]">
        {/* Conversation list */}
        <aside className="overflow-y-auto border-r border-border">
          {conversations.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Sem conversas ainda.</div>
          ) : conversations.map(({ peer, last }) => {
            const p: any = peerMap.get(peer);
            const active = activePeer === peer;
            return (
              <button key={peer} onClick={() => setActivePeer(peer)}
                className={`flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition ${active ? "bg-primary/10" : "hover:bg-secondary"}`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {p?.username?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="truncate text-sm font-semibold">{p?.display_name ?? p?.username ?? "Utilizador"}</div>
                  <div className="truncate text-xs text-muted-foreground">{last.content ?? (last.media_url ? "📎 Media" : "")}</div>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Thread */}
        <section className="flex flex-col">
          {!activePeer ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Seleciona uma conversa.</div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {thread.map((m) => {
                  const mine = m.sender_id === user?.id;
                  const lockedMedia = !!m.media_url && m.media_price > 0 && !mine;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                        {m.content && <div className="whitespace-pre-wrap">{m.content}</div>}
                        {m.media_url && (
                          <div className="relative mt-2 overflow-hidden rounded">
                            <img src={m.media_url} alt="" className={`max-h-64 w-full object-cover ${lockedMedia ? "blur-locked" : ""}`} />
                            {lockedMedia && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 text-white">
                                <Lock className="h-5 w-5" />
                                <div className="text-xs font-medium">Desbloquear por {m.media_price} créd.</div>
                              </div>
                            )}
                          </div>
                        )}
                        <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {new Date(m.created_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border p-3">
                {showMedia && (
                  <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-background p-2">
                    <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="URL da imagem (Cloudinary)" className="flex-1 bg-transparent text-xs outline-none" />
                    <div className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <input type="number" min={0} value={mediaPrice} onChange={(e) => setMediaPrice(Math.max(0, +e.target.value))} className="w-16 bg-transparent outline-none" />
                      <span className="text-muted-foreground">créd.</span>
                    </div>
                    <button onClick={() => { setShowMedia(false); setMediaUrl(""); setMediaPrice(0); }} className="text-muted-foreground"><X className="h-3 w-3" /></button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowMedia((s) => !s)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground hover:text-foreground">📎 Media</button>
                  <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Escreve uma mensagem..."
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
                  <button onClick={send} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
