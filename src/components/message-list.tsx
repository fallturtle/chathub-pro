import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { format, isToday, isYesterday } from "date-fns";
import { Pin, Trash2, SmilePlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type Msg = {
  id: string;
  body: string;
  author_id: string;
  created_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  pinned: boolean | null;
  channel_id: string | null;
  dm_thread_id: string | null;
  author?: any;
};

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥"];

export function MessageList({
  channelId,
  dmThreadId,
  blockedWords = [],
  canManage = false,
}: {
  channelId?: string;
  dmThreadId?: string;
  blockedWords?: string[];
  canManage?: boolean;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reactions, setReactions] = useState<Record<string, { emoji: string; user_id: string }[]>>({});
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const filterText = (t: string) => {
    let out = t;
    for (const w of blockedWords) {
      if (!w) continue;
      const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "gi");
      out = out.replace(re, "#".repeat(w.length));
    }
    return out;
  };

  const loadProfiles = async (ids: string[]) => {
    const missing = ids.filter((i) => !profiles[i]);
    if (!missing.length) return;
    const { data } = await supabase.from("profiles").select("id,username,display_name,avatar_color,avatar_url").in("id", missing);
    if (data) setProfiles((p) => { const n = { ...p }; for (const x of data) n[x.id] = x; return n; });
  };

  const loadReactions = async (mids: string[]) => {
    if (!mids.length) return;
    const { data } = await supabase.from("reactions").select("message_id,emoji,user_id").in("message_id", mids);
    const grouped: Record<string, any[]> = {};
    for (const r of data ?? []) (grouped[r.message_id] ??= []).push(r);
    setReactions(grouped);
  };

  useEffect(() => {
    setMessages([]);
    setReactions({});
    let q = supabase.from("messages").select("*").order("created_at", { ascending: true }).limit(200);
    if (channelId) q = q.eq("channel_id", channelId);
    if (dmThreadId) q = q.eq("dm_thread_id", dmThreadId);
    q.then(async ({ data }) => {
      setMessages((data ?? []) as Msg[]);
      const ids = Array.from(new Set((data ?? []).map((m) => m.author_id)));
      await loadProfiles(ids);
      await loadReactions((data ?? []).map((m) => m.id));
    });

    const filterStr = channelId ? `channel_id=eq.${channelId}` : `dm_thread_id=eq.${dmThreadId}`;
    const ch = supabase
      .channel(`msgs-${channelId ?? dmThreadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: filterStr }, async (p) => {
        const m = p.new as Msg;
        await loadProfiles([m.author_id]);
        setMessages((prev) => [...prev, m]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: filterStr }, (p) => {
        setMessages((prev) => prev.map((m) => (m.id === (p.new as any).id ? (p.new as Msg) : m)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: filterStr }, (p) => {
        setMessages((prev) => prev.filter((m) => m.id !== (p.old as any).id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, async () => {
        const mids = messagesRef.current.map((m) => m.id);
        if (mids.length) await loadReactions(mids);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, dmThreadId]);

  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const toggleReaction = async (mid: string, emoji: string) => {
    if (!user) return;
    const has = (reactions[mid] ?? []).some((r) => r.user_id === user.id && r.emoji === emoji);
    if (has) {
      await supabase.from("reactions").delete().match({ message_id: mid, user_id: user.id, emoji });
    } else {
      await supabase.from("reactions").insert({ message_id: mid, user_id: user.id, emoji });
    }
  };

  const deleteMsg = async (mid: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", mid);
    if (error) toast.error(error.message);
  };

  const pinMsg = async (m: Msg) => {
    await supabase.from("messages").update({ pinned: !m.pinned }).eq("id", m.id);
  };

  // Smart grouping: same author within 5 minutes
  const grouped: { author: string; date: Date; msgs: Msg[] }[] = [];
  let lastDay: string | null = null;
  for (const m of messages) {
    const last = grouped[grouped.length - 1];
    const created = m.created_at ?? new Date().toISOString();
    if (last && last.author === m.author_id && new Date(created).getTime() - last.date.getTime() < 5 * 60 * 1000) {
      last.msgs.push(m);
    } else {
      grouped.push({ author: m.author_id, date: new Date(created), msgs: [m] });
    }
  }

  const fmtDay = (d: Date) =>
    isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "MMM d, yyyy");

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12">No messages yet — say hello!</p>
      )}
      {grouped.map((g, gi) => {
        const dayStr = fmtDay(g.date);
        const showDay = dayStr !== lastDay;
        lastDay = dayStr;
        const prof = profiles[g.author];
        return (
          <div key={gi}>
            {showDay && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{dayStr}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            <div className="flex gap-3 group">
              <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: prof?.avatar_color ?? "#7c3aed" }}>
                {(prof?.username ?? "?")[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-sm">{prof?.display_name || prof?.username || "…"}</span>
                  <span className="text-xs text-muted-foreground">{format(g.date, "HH:mm")}</span>
                </div>
                {g.msgs.map((m) => (
                  <div key={m.id} className="group/msg relative -mx-2 px-2 py-0.5 hover:bg-accent/50 rounded">
                    {m.deleted_at ? (
                      <em className="text-xs text-muted-foreground">(message deleted)</em>
                    ) : (
                      <div className="text-sm break-words whitespace-pre-wrap">
                        {filterText(m.body)}
                        {m.edited_at && <span className="text-[10px] text-muted-foreground ml-1">(edited)</span>}
                        {m.pinned && <Pin className="inline h-3 w-3 ml-1 text-primary" />}
                      </div>
                    )}
                    {(reactions[m.id]?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(
                          (reactions[m.id] ?? []).reduce<Record<string, string[]>>((acc, r) => {
                            (acc[r.emoji] ??= []).push(r.user_id);
                            return acc;
                          }, {}),
                        ).map(([e, users]) => (
                          <button
                            key={e}
                            onClick={() => toggleReaction(m.id, e)}
                            className={`text-xs px-1.5 py-0.5 rounded-full border ${user && users.includes(user.id) ? "bg-primary/20 border-primary" : "bg-accent"}`}
                          >
                            {e} {users.length}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="absolute right-2 -top-3 opacity-0 group-hover/msg:opacity-100 flex gap-1 bg-popover border rounded shadow-sm">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 hover:bg-accent rounded"><SmilePlus className="h-4 w-4" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <div className="flex gap-1 p-1">
                            {REACTIONS.map((e) => (
                              <button key={e} onClick={() => toggleReaction(m.id, e)} className="text-lg p-1 hover:bg-accent rounded">{e}</button>
                            ))}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {(canManage || m.author_id === user?.id) && channelId && (
                        <button onClick={() => pinMsg(m)} className="p-1 hover:bg-accent rounded" title="Pin"><Pin className="h-4 w-4" /></button>
                      )}
                      {(canManage || m.author_id === user?.id) && (
                        <button onClick={() => deleteMsg(m.id)} className="p-1 hover:bg-accent rounded text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}