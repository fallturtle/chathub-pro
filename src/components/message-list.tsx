import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { format, isToday, isYesterday } from "date-fns";
import { Pin, Trash2, SmilePlus, Reply, Pencil, Check, X, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { ReplyTarget } from "./message-composer";

type Msg = {
  id: string; body: string; author_id: string; created_at: string | null;
  edited_at: string | null; deleted_at: string | null; pinned: boolean | null;
  channel_id: string | null; dm_thread_id: string | null; parent_id: string | null;
};
type Att = { id: string; message_id: string; url: string; mime: string | null; name: string | null; kind: string | null };
type Poll = { id: string; message_id: string; question: string; kind: string };
type PollOpt = { id: string; poll_id: string; label: string; position: number | null };
type PollVote = { poll_id: string; option_id: string; user_id: string };

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥"];

export function MessageList({
  channelId, dmThreadId, blockedWords = [], canManage = false,
  onReply, pinnedOnly = false,
}: {
  channelId?: string; dmThreadId?: string; blockedWords?: string[]; canManage?: boolean;
  onReply?: (t: ReplyTarget) => void; pinnedOnly?: boolean;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reactions, setReactions] = useState<Record<string, { emoji: string; user_id: string }[]>>({});
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [attachments, setAttachments] = useState<Record<string, Att[]>>({});
  const [polls, setPolls] = useState<Record<string, Poll>>({});
  const [pollOpts, setPollOpts] = useState<Record<string, PollOpt[]>>({});
  const [pollVotes, setPollVotes] = useState<Record<string, PollVote[]>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
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
    const missing = Array.from(new Set(ids)).filter((i) => i && !profiles[i]);
    if (!missing.length) return;
    const { data } = await supabase.from("profiles").select("id,username,display_name,avatar_color,avatar_url").in("id", missing);
    if (data) setProfiles((p) => { const n = { ...p }; for (const x of data) n[x.id] = x; return n; });
  };

  const loadExtras = async (mids: string[]) => {
    if (!mids.length) return;
    const [r, a, p] = await Promise.all([
      supabase.from("reactions").select("message_id,emoji,user_id").in("message_id", mids),
      supabase.from("attachments").select("*").in("message_id", mids),
      supabase.from("polls").select("*").in("message_id", mids),
    ]);
    const grouped: Record<string, any[]> = {};
    for (const x of r.data ?? []) (grouped[x.message_id] ??= []).push(x);
    setReactions(grouped);
    const at: Record<string, Att[]> = {};
    for (const x of a.data ?? []) (at[x.message_id] ??= []).push(x as Att);
    setAttachments(at);
    const pls: Record<string, Poll> = {};
    for (const x of p.data ?? []) pls[x.message_id] = x as Poll;
    setPolls(pls);
    const pollIds = (p.data ?? []).map((x: any) => x.id);
    if (pollIds.length) {
      const [opts, votes] = await Promise.all([
        supabase.from("poll_options").select("*").in("poll_id", pollIds),
        supabase.from("poll_votes").select("poll_id,option_id,user_id").in("poll_id", pollIds),
      ]);
      const og: Record<string, PollOpt[]> = {};
      for (const o of opts.data ?? []) (og[o.poll_id] ??= []).push(o as PollOpt);
      for (const k in og) og[k].sort((x, y) => (x.position ?? 0) - (y.position ?? 0));
      setPollOpts(og);
      const vg: Record<string, PollVote[]> = {};
      for (const v of votes.data ?? []) (vg[v.poll_id] ??= []).push(v as PollVote);
      setPollVotes(vg);
    }
  };

  useEffect(() => {
    setMessages([]); setReactions({}); setAttachments({}); setPolls({}); setPollOpts({}); setPollVotes({});
    let q = supabase.from("messages").select("*").order("created_at", { ascending: true }).limit(200);
    if (channelId) q = q.eq("channel_id", channelId);
    if (dmThreadId) q = q.eq("dm_thread_id", dmThreadId);
    if (pinnedOnly) q = q.eq("pinned", true);
    q.then(async ({ data }) => {
      const list = (data ?? []) as Msg[];
      setMessages(list);
      await loadProfiles(list.map((m) => m.author_id));
      await loadExtras(list.map((m) => m.id));
      // also load parent authors for replies
      const parentIds = list.map((m) => m.parent_id).filter(Boolean) as string[];
      if (parentIds.length) {
        const { data: parents } = await supabase.from("messages").select("id,body,author_id").in("id", parentIds);
        if (parents) {
          await loadProfiles(parents.map((p: any) => p.author_id));
          setMessages((prev) => prev.map((m) => {
            const p = parents.find((x: any) => x.id === m.parent_id);
            return p ? { ...m, _parent: p } as any : m;
          }));
        }
      }
    });

    if (pinnedOnly) return;
    const filterStr = channelId ? `channel_id=eq.${channelId}` : `dm_thread_id=eq.${dmThreadId}`;
    const ch = supabase
      .channel(`msgs-${channelId ?? dmThreadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: filterStr }, async (p) => {
        const m = p.new as Msg;
        await loadProfiles([m.author_id]);
        await loadExtras([m.id]);
        setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        // Browser notification (only when tab hidden, only for others' messages)
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted" && document.hidden && m.author_id !== user?.id) {
          const prof = profiles[m.author_id];
          try {
            new Notification(prof?.display_name || prof?.username || "New message", {
              body: m.body.slice(0, 140),
              tag: m.id,
            });
          } catch {}
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: filterStr }, (p) => {
        setMessages((prev) => prev.map((m) => (m.id === (p.new as any).id ? { ...m, ...(p.new as Msg) } : m)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: filterStr }, (p) => {
        setMessages((prev) => prev.filter((m) => m.id !== (p.old as any).id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, async () => {
        const mids = messagesRef.current.map((m) => m.id);
        if (mids.length) {
          const { data } = await supabase.from("reactions").select("message_id,emoji,user_id").in("message_id", mids);
          const g: Record<string, any[]> = {};
          for (const x of data ?? []) (g[x.message_id] ??= []).push(x);
          setReactions(g);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, async () => {
        const ids = Object.values(polls).map((p) => p.id);
        if (ids.length) {
          const { data } = await supabase.from("poll_votes").select("poll_id,option_id,user_id").in("poll_id", ids);
          const vg: Record<string, PollVote[]> = {};
          for (const v of data ?? []) (vg[v.poll_id] ??= []).push(v as PollVote);
          setPollVotes(vg);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, dmThreadId, pinnedOnly]);

  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { if (!pinnedOnly) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, pinnedOnly]);

  const toggleReaction = async (mid: string, emoji: string) => {
    if (!user) return;
    const has = (reactions[mid] ?? []).some((r) => r.user_id === user.id && r.emoji === emoji);
    if (has) await supabase.from("reactions").delete().match({ message_id: mid, user_id: user.id, emoji });
    else await supabase.from("reactions").insert({ message_id: mid, user_id: user.id, emoji });
  };
  const deleteMsg = async (mid: string) => { const { error } = await supabase.from("messages").delete().eq("id", mid); if (error) toast.error(error.message); };
  const pinMsg = async (m: Msg) => { await supabase.from("messages").update({ pinned: !m.pinned }).eq("id", m.id); };
  const startEdit = (m: Msg) => { setEditingId(m.id); setEditBody(m.body); };
  const saveEdit = async (mid: string) => {
    const { error } = await supabase.from("messages").update({ body: editBody, edited_at: new Date().toISOString() }).eq("id", mid);
    if (error) toast.error(error.message); else setEditingId(null);
  };

  const votePoll = async (poll: Poll, optionId: string) => {
    if (!user) return;
    const current = (pollVotes[poll.id] ?? []).filter((v) => v.user_id === user.id);
    const hasThis = current.some((v) => v.option_id === optionId);
    if (poll.kind === "single") {
      if (current.length) await supabase.from("poll_votes").delete().match({ poll_id: poll.id, user_id: user.id });
      if (!hasThis) await supabase.from("poll_votes").insert({ poll_id: poll.id, option_id: optionId, user_id: user.id });
    } else {
      if (hasThis) await supabase.from("poll_votes").delete().match({ poll_id: poll.id, user_id: user.id, option_id: optionId });
      else await supabase.from("poll_votes").insert({ poll_id: poll.id, option_id: optionId, user_id: user.id });
    }
  };

  // Smart grouping
  const grouped: { author: string; date: Date; msgs: Msg[] }[] = [];
  for (const m of messages) {
    const last = grouped[grouped.length - 1];
    const created = m.created_at ?? new Date().toISOString();
    if (last && last.author === m.author_id && new Date(created).getTime() - last.date.getTime() < 5 * 60 * 1000 && !m.parent_id) {
      last.msgs.push(m);
    } else {
      grouped.push({ author: m.author_id, date: new Date(created), msgs: [m] });
    }
  }
  let lastDay: string | null = null;
  const fmtDay = (d: Date) => isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "MMM d, yyyy");

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12">{pinnedOnly ? "Nothing pinned yet." : "No messages yet — say hello!"}</p>
      )}
      {grouped.map((g, gi) => {
        const dayStr = fmtDay(g.date);
        const showDay = !pinnedOnly && dayStr !== lastDay;
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
                {g.msgs.map((m) => {
                  const parent = (m as any)._parent as { id: string; body: string; author_id: string } | undefined;
                  const parentProf = parent ? profiles[parent.author_id] : null;
                  const atts = attachments[m.id] ?? [];
                  const poll = polls[m.id];
                  const opts = poll ? (pollOpts[poll.id] ?? []) : [];
                  const votes = poll ? (pollVotes[poll.id] ?? []) : [];
                  const myVotes = poll && user ? votes.filter((v) => v.user_id === user.id).map((v) => v.option_id) : [];
                  const totalVoters = new Set(votes.map((v) => v.user_id)).size;
                  return (
                    <div key={m.id} className="group/msg relative -mx-2 px-2 py-0.5 hover:bg-accent/50 rounded">
                      {parent && (
                        <div className="text-xs flex items-center gap-1 text-muted-foreground border-l-2 border-primary/40 pl-2 my-1">
                          <Reply className="h-3 w-3" />
                          <strong>{parentProf?.display_name || parentProf?.username || "…"}:</strong>
                          <span className="truncate italic opacity-80">{parent.body.slice(0, 100)}</span>
                        </div>
                      )}
                      {m.deleted_at ? (
                        <em className="text-xs text-muted-foreground">(message deleted)</em>
                      ) : editingId === m.id ? (
                        <div className="flex gap-1 items-start">
                          <textarea autoFocus value={editBody} onChange={(e) => setEditBody(e.target.value)} className="flex-1 text-sm p-1 rounded border bg-background" rows={2} />
                          <button onClick={() => saveEdit(m.id)} className="p-1 hover:bg-accent rounded text-primary"><Check className="h-4 w-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 hover:bg-accent rounded"><X className="h-4 w-4" /></button>
                        </div>
                      ) : (
                        <div className="text-sm break-words whitespace-pre-wrap">
                          {filterText(m.body)}
                          {m.edited_at && <span className="text-[10px] text-muted-foreground ml-1">(edited)</span>}
                          {m.pinned && <Pin className="inline h-3 w-3 ml-1 text-primary" />}
                        </div>
                      )}
                      {atts.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-2">
                          {atts.map((a) => a.kind === "image" ? (
                            <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer">
                              <img src={a.url} alt={a.name ?? ""} className="max-h-64 max-w-xs rounded border" />
                            </a>
                          ) : (
                            <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs px-2 py-1 rounded border bg-muted hover:bg-accent">
                              <Download className="h-3 w-3" /> {a.name ?? "file"}
                            </a>
                          ))}
                        </div>
                      )}
                      {poll && (
                        <div className="mt-2 p-3 rounded-lg border bg-muted/30 space-y-1.5 max-w-md">
                          <div className="font-semibold text-sm">{poll.question}</div>
                          {opts.map((o) => {
                            const count = votes.filter((v) => v.option_id === o.id).length;
                            const pct = totalVoters ? Math.round((count / totalVoters) * 100) : 0;
                            const mine = myVotes.includes(o.id);
                            return (
                              <button key={o.id} onClick={() => votePoll(poll, o.id)} className={`relative w-full text-left px-2 py-1.5 rounded border text-xs overflow-hidden ${mine ? "border-primary bg-primary/10" : "hover:bg-accent"}`}>
                                <div className="absolute inset-0 bg-primary/10" style={{ width: `${pct}%` }} />
                                <div className="relative flex justify-between"><span>{mine ? "✓ " : ""}{o.label}</span><span className="text-muted-foreground">{count} · {pct}%</span></div>
                              </button>
                            );
                          })}
                          <div className="text-[10px] text-muted-foreground">{totalVoters} voter{totalVoters === 1 ? "" : "s"} · {poll.kind === "multi" ? "multi-choice" : "single choice"}</div>
                        </div>
                      )}
                      {(reactions[m.id]?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries((reactions[m.id] ?? []).reduce<Record<string, string[]>>((acc, r) => { (acc[r.emoji] ??= []).push(r.user_id); return acc; }, {})).map(([e, users]) => (
                            <button key={e} onClick={() => toggleReaction(m.id, e)} className={`text-xs px-1.5 py-0.5 rounded-full border ${user && users.includes(user.id) ? "bg-primary/20 border-primary" : "bg-accent"}`}>{e} {users.length}</button>
                          ))}
                        </div>
                      )}
                      {!pinnedOnly && (
                        <div className="absolute right-2 -top-3 opacity-0 group-hover/msg:opacity-100 flex gap-1 bg-popover border rounded shadow-sm">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><button className="p-1 hover:bg-accent rounded"><SmilePlus className="h-4 w-4" /></button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <div className="flex gap-1 p-1">{REACTIONS.map((e) => (<button key={e} onClick={() => toggleReaction(m.id, e)} className="text-lg p-1 hover:bg-accent rounded">{e}</button>))}</div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {onReply && (
                            <button onClick={() => onReply({ id: m.id, body: m.body, authorName: prof?.display_name || prof?.username || "user" })} className="p-1 hover:bg-accent rounded" title="Reply"><Reply className="h-4 w-4" /></button>
                          )}
                          {m.author_id === user?.id && !m.deleted_at && (
                            <button onClick={() => startEdit(m)} className="p-1 hover:bg-accent rounded" title="Edit"><Pencil className="h-4 w-4" /></button>
                          )}
                          {(canManage || m.author_id === user?.id) && channelId && (
                            <button onClick={() => pinMsg(m)} className="p-1 hover:bg-accent rounded" title="Pin"><Pin className="h-4 w-4" /></button>
                          )}
                          {(canManage || m.author_id === user?.id) && (
                            <button onClick={() => deleteMsg(m.id)} className="p-1 hover:bg-accent rounded text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
