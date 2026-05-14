import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Send, Smile, Paperclip, BarChart3, X, Reply } from "lucide-react";
import { toast } from "sonner";
import { EmojiPicker } from "./emoji-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ReplyTarget = { id: string; body: string; authorName: string } | null;

export function MessageComposer({
  channelId,
  dmThreadId,
  disabled,
  placeholder = "Message…",
  replyTo,
  onClearReply,
}: {
  channelId?: string;
  dmThreadId?: string;
  disabled?: boolean;
  placeholder?: string;
  replyTo?: ReplyTarget;
  onClearReply?: () => void;
}) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 200) + "px";
    }
  }, [body]);

  const insertMessage = async (extra?: { body?: string }) => {
    if (!user) return null;
    const payload: any = {
      author_id: user.id,
      body: extra?.body ?? body.trim(),
      parent_id: replyTo?.id ?? null,
    };
    if (channelId) payload.channel_id = channelId;
    if (dmThreadId) payload.dm_thread_id = dmThreadId;
    const { data, error } = await supabase.from("messages").insert(payload).select("id").single();
    if (error) { toast.error(error.message); return null; }
    return data.id as string;
  };

  const send = async () => {
    if (!body.trim() || sending) return;
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

  if (disabled) {
    return <div className="border-t p-4 text-center text-sm text-muted-foreground bg-muted/30">You don't have permission to post here.</div>;
  }

  return (
    <div className="border-t">
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/40 border-b text-xs">
          <Reply className="h-3 w-3 text-primary" />
          <span className="text-muted-foreground">Replying to <strong>{replyTo.authorName}</strong></span>
          <span className="truncate flex-1 italic opacity-70">{replyTo.body.slice(0, 80)}</span>
          <button onClick={onClearReply} className="hover:bg-accent rounded p-0.5"><X className="h-3 w-3" /></button>
        </div>
      )}
      <div className="p-3">
        <div className="flex gap-2 items-end relative">
          <div className="relative flex">
            <button onClick={() => fileRef.current?.click()} className="p-2 hover:bg-accent rounded" title="Attach file"><Paperclip className="h-5 w-5" /></button>
            <input ref={fileRef} type="file" hidden onChange={onPickFile} />
            <button onClick={() => setShowEmoji((v) => !v)} className="p-2 hover:bg-accent rounded" title="Emoji"><Smile className="h-5 w-5" /></button>
            <button onClick={() => setPollOpen(true)} className="p-2 hover:bg-accent rounded" title="Poll"><BarChart3 className="h-5 w-5" /></button>
            {showEmoji && (
              <div className="absolute bottom-12 left-0 z-20">
                <EmojiPicker onSelect={(e) => { setBody((b) => b + e); setShowEmoji(false); taRef.current?.focus(); }} />
              </div>
            )}
          </div>
          <textarea
            ref={taRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            placeholder={placeholder}
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
          if (error || !poll) return toast.error(error?.message ?? "Poll failed");
          await supabase.from("poll_options").insert(opts.map((label, i) => ({ poll_id: poll.id, label, position: i })));
          setBody(""); onClearReply?.();
        }}
      />
    </div>
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
