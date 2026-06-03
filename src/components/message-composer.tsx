import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Send, Smile, Paperclip, BarChart3, X, Reply, Plus, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { EmojiPicker } from "./emoji-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ReplyTarget = { id: string; body: string; authorName: string } | null;

type SlashCmd = { name: string; desc: string; run?: (args: string, ctx: { body: string }) => string | Promise<string> };

const SLASH_COMMANDS: SlashCmd[] = [
  { name: "decision", desc: "Post a highlighted decision", run: (args) => `📌 Decision: ${args || "…"}` },
  { name: "question", desc: "Format a channel question", run: (args) => `❓ Question: ${args || "…"}` },
  { name: "todo", desc: "Add a quick task line", run: (args) => `☐ ${args || "Task"}` },
  { name: "quote", desc: "Quote text cleanly", run: (args) => `> ${args || "quoted text"}` },
  { name: "checkin", desc: "Share a quick status", run: (args) => `✅ Check-in: ${args || "all good"}` },
  { name: "poll", desc: "Open the poll creator" },
  { name: "help", desc: "List all slash commands" },
  { name: "clear", desc: "Clear the composer" },
];

export function MessageComposer({
  channelId, dmThreadId, disabled, placeholder = "Message…", replyTo, onClearReply,
  spaceId, canManageCustom = false,
}: {
  channelId?: string; dmThreadId?: string; disabled?: boolean; placeholder?: string;
  replyTo?: ReplyTarget; onClearReply?: () => void;
  spaceId?: string; canManageCustom?: boolean;
}) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 200) + "px";
    }
  }, [body]);

  // Slash command suggestions
  const slashMatch = body.match(/^\/([a-z]*)$/i);
  const suggestions = slashMatch ? SLASH_COMMANDS.filter((c) => c.name.startsWith(slashMatch[1].toLowerCase())) : [];

  const applyCommand = async (cmd: SlashCmd, args: string) => {
    if (cmd.name === "poll") { setPollOpen(true); setBody(""); return; }
    if (cmd.name === "clear") { setBody(""); return; }
    if (cmd.name === "help") {
      setBody("");
      toast.info(SLASH_COMMANDS.map((c) => `/${c.name} — ${c.desc}`).join("\n"));
      return;
    }
    if (cmd.run) setBody(await cmd.run(args, { body }));
    taRef.current?.focus();
  };

  const insertMessage = async (extra?: { body?: string }) => {
    if (!user) return null;
    const text = extra?.body ?? body.trim();
    const payload: any = { author_id: user.id, body: text, parent_id: replyTo?.id ?? null };
    if (channelId) payload.channel_id = channelId;
    if (dmThreadId) payload.dm_thread_id = dmThreadId;
    const { data, error } = await supabase.from("messages").insert(payload).select("id").single();
    if (error) { toast.error(error.message); return null; }
    const mentionTargets = Array.from(text.matchAll(/@([a-z0-9_]{2,32}|all|here)/gi)).map((m) => m[1].toLowerCase());
    if (mentionTargets.length && channelId) {
      const usernames = Array.from(new Set(mentionTargets.filter((t) => t !== "all" && t !== "here")));
      const wantsAll = mentionTargets.includes("all") || mentionTargets.includes("here");
      const rows: any[] = [];
      if (usernames.length) {
        const { data: profs } = await supabase.from("profiles").select("id,username").in("username", usernames);
        for (const p of profs ?? []) rows.push({ message_id: data.id, user_id: p.id, target: `@${p.username}` });
      }
      if (wantsAll) {
        const { data: ch } = await supabase.from("channels").select("space_id").eq("id", channelId).maybeSingle();
        if (ch) {
          const { data: sp } = await supabase.from("spaces").select("mention_all_policy").eq("id", ch.space_id).maybeSingle();
          const policy = (sp as any)?.mention_all_policy ?? "managers";
          const { data: me } = await supabase.from("space_members").select("role").eq("space_id", ch.space_id).eq("user_id", user.id).maybeSingle();
          const myRole = (me as any)?.role ?? "member";
          const allowed = policy === "everyone" || (policy === "managers" && (myRole === "manager" || myRole === "owner")) || (policy === "owner" && myRole === "owner");
          if (allowed) rows.push({ message_id: data.id, user_id: null, target: "@all" });
          else toast.warning("You can't @all in this space");
        }
      }
      if (rows.length) await supabase.from("mentions").insert(rows);
    }
    return data.id as string;
  };

  const send = async () => {
    if (!body.trim() || sending) return;
    // Check for slash command match
    const m = body.match(/^\/([a-z]+)(?:\s+(.*))?$/i);
    if (m) {
      const cmd = SLASH_COMMANDS.find((c) => c.name === m[1].toLowerCase());
      if (cmd) { await applyCommand(cmd, m[2] ?? ""); return; }
    }
    setSending(true);
    const id = await insertMessage();
    setSending(false);
    if (id) { setBody(""); onClearReply?.(); }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 25 * 1024 * 1024) return toast.error("Max 25MB");
    setSending(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("attachments").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("attachments").getPublicUrl(path);
      const url = pub.publicUrl;
      const id = await insertMessage({ body: body.trim() || file.name });
      if (!id) return;
      const isImage = file.type.startsWith("image/");
      await supabase.from("attachments").insert({
        message_id: id, url, mime: file.type, name: file.name, size: file.size, kind: isImage ? "image" : "file",
      });
      setBody(""); onClearReply?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setSending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const sendGifUrl = async (url: string) => {
    if (!user || !/^https?:\/\//.test(url)) { toast.error("Enter a valid image/GIF URL"); return; }
    setSending(true);
    try {
      const id = await insertMessage({ body: body.trim() || "" });
      if (!id) return;
      await supabase.from("attachments").insert({
        message_id: id, url, mime: "image/gif", name: "gif", size: null, kind: "image",
      });
      setBody(""); onClearReply?.(); setGifOpen(false);
    } finally { setSending(false); }
  };

  if (disabled) {
    return <div className="border-t p-4 text-center text-sm text-muted-foreground bg-muted/30">You don't have permission to post here.</div>;
  }

  return (
    <div className="border-t relative">
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/40 border-b text-xs">
          <Reply className="h-3 w-3 text-primary" />
          <span className="text-muted-foreground">Replying to <strong>{replyTo.authorName}</strong></span>
          <span className="truncate flex-1 italic opacity-70">{replyTo.body.slice(0, 80)}</span>
          <button onClick={onClearReply} className="hover:bg-accent rounded p-0.5"><X className="h-3 w-3" /></button>
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="absolute bottom-full left-3 right-3 mb-1 z-30 bg-popover border rounded-md shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((c) => (
            <button
              key={c.name}
              onClick={() => { setBody(`/${c.name} `); taRef.current?.focus(); }}
              className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm flex items-center gap-2"
            >
              <span className="font-mono text-primary">/{c.name}</span>
              <span className="text-xs text-muted-foreground truncate">{c.desc}</span>
            </button>
          ))}
        </div>
      )}
      <div className="p-3">
        <div className="flex gap-2 items-end">
          <Popover open={plusOpen} onOpenChange={setPlusOpen}>
            <PopoverTrigger asChild>
              <button className="p-2 hover:bg-accent rounded" title="Add"><Plus className="h-5 w-5" /></button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-44 p-1">
              <button onClick={() => { setPlusOpen(false); fileRef.current?.click(); }} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded text-sm"><Paperclip className="h-4 w-4" /> File or image</button>
              <button onClick={() => { setPlusOpen(false); setGifOpen(true); }} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded text-sm"><ImageIcon className="h-4 w-4" /> GIF / sticker</button>
              <button onClick={() => { setPlusOpen(false); setPollOpen(true); }} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded text-sm"><BarChart3 className="h-4 w-4" /> Poll</button>
              <button onClick={() => { setPlusOpen(false); setShowEmoji(true); }} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded text-sm"><Smile className="h-4 w-4" /> Emoji</button>
            </PopoverContent>
          </Popover>
          <input ref={fileRef} type="file" hidden onChange={onPickFile} />
          {showEmoji && (
            <div className="absolute bottom-16 left-3 z-30">
              <EmojiPicker spaceId={spaceId} canManageCustom={canManageCustom} onClose={() => setShowEmoji(false)} onSelect={(e) => { setBody((b) => b + e); setShowEmoji(false); taRef.current?.focus(); }} />
            </div>
          )}
          <textarea
            ref={taRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Tab" && suggestions.length > 0) {
                e.preventDefault();
                setBody(`/${suggestions[0].name} `);
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            rows={1}
            placeholder={placeholder + "  ·  Try /help"}
            className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button onClick={send} disabled={sending || !body.trim()}><Send className="h-4 w-4" /></Button>
        </div>
      </div>
      <PollDialog
        open={pollOpen}
        onOpenChange={setPollOpen}
        onCreate={async (q, opts, kind) => {
          const id = await insertMessage({ body: `📊 Poll: ${q}` });
          if (!id) return;
          const { data: poll, error } = await supabase.from("polls").insert({ message_id: id, question: q, kind }).select("id").single();
          if (error || !poll) { toast.error(error?.message ?? "Poll failed"); return; }
          await supabase.from("poll_options").insert(opts.map((label, i) => ({ poll_id: poll.id, label, position: i })));
          setBody(""); onClearReply?.();
        }}
      />
      <GifDialog open={gifOpen} onOpenChange={setGifOpen} onSubmit={sendGifUrl} />
    </div>
  );
}

function GifDialog({ open, onOpenChange, onSubmit }: { open: boolean; onOpenChange: (v: boolean) => void; onSubmit: (url: string) => Promise<void> }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const STICKERS = [
    "https://media.tenor.com/x8v1oNUOmg4AAAAi/thumbs-up.gif",
    "https://media.tenor.com/9pyhmDpsZdoAAAAi/fire.gif",
    "https://media.tenor.com/MA8b3HOk2EQAAAAi/party-parrot.gif",
    "https://media.tenor.com/cD-NHHsM8DwAAAAi/clap.gif",
    "https://media.tenor.com/c1y3IpZWMAQAAAAi/heart-blob.gif",
    "https://media.tenor.com/IbuC8mxPa0YAAAAi/cat-cute.gif",
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Send a GIF or sticker</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {STICKERS.map((s) => (
              <button key={s} onClick={async () => { setBusy(true); await onSubmit(s); setBusy(false); }} disabled={busy} className="border rounded-lg overflow-hidden hover:ring-2 hover:ring-primary aspect-square bg-muted">
                <img src={s} alt="sticker" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <Label className="text-xs shrink-0">Or paste URL:</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/file.gif" />
            <Button size="sm" disabled={busy || !url.trim()} onClick={async () => { setBusy(true); await onSubmit(url.trim()); setBusy(false); setUrl(""); }}>Send</Button>
          </div>
          <p className="text-xs text-muted-foreground">Paste any direct image or GIF URL from Tenor, Giphy, or anywhere else.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PollDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: (q: string, opts: string[], kind: "single" | "multi") => Promise<void> }) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", ""]);
  const [kind, setKind] = useState<"single" | "multi">("single");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const cleaned = opts.map((o) => o.trim()).filter(Boolean);
    if (!q.trim() || cleaned.length < 2) return toast.error("Need a question and 2+ options");
    setBusy(true);
    await onCreate(q.trim(), cleaned, kind);
    setBusy(false);
    setQ(""); setOpts(["", ""]); setKind("single");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create poll</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Question</Label><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="What should we play?" /></div>
          <div className="space-y-2">
            <Label>Options</Label>
            {opts.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input value={o} onChange={(e) => setOpts(opts.map((v, j) => j === i ? e.target.value : v))} placeholder={`Option ${i + 1}`} />
                {opts.length > 2 && <Button variant="ghost" size="icon" onClick={() => setOpts(opts.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setOpts([...opts, ""])} disabled={opts.length >= 10}>+ Add option</Button>
          </div>
          <div className="flex gap-2">
            <Button variant={kind === "single" ? "default" : "outline"} size="sm" onClick={() => setKind("single")}>Single choice</Button>
            <Button variant={kind === "multi" ? "default" : "outline"} size="sm" onClick={() => setKind("multi")}>Multiple choice</Button>
          </div>
          <Button className="w-full" onClick={submit} disabled={busy}>Create poll</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
