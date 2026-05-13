import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Send, Smile } from "lucide-react";
import { toast } from "sonner";

const QUICK_EMOJIS = ["😀","😂","😍","🤔","👍","❤️","🔥","🎉","🚀","✨","😢","😡"];

export function MessageComposer({
  channelId,
  dmThreadId,
  disabled,
  placeholder = "Message…",
  blockedWords = [],
}: {
  channelId?: string;
  dmThreadId?: string;
  disabled?: boolean;
  placeholder?: string;
  blockedWords?: string[];
}) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 200) + "px";
    }
  }, [body]);

  const send = async () => {
    if (!user || !body.trim()) return;
    setSending(true);
    const payload: any = { author_id: user.id, body: body.trim() };
    if (channelId) payload.channel_id = channelId;
    if (dmThreadId) payload.dm_thread_id = dmThreadId;
    const { error } = await supabase.from("messages").insert(payload);
    setSending(false);
    if (error) return toast.error(error.message);
    setBody("");
  };

  if (disabled) {
    return (
      <div className="border-t p-4 text-center text-sm text-muted-foreground bg-muted/30">
        You don't have permission to post here.
      </div>
    );
  }

  return (
    <div className="border-t p-3">
      <div className="flex gap-2 items-end relative">
        <div className="relative">
          <button onClick={() => setShowEmoji((v) => !v)} className="p-2 hover:bg-accent rounded">
            <Smile className="h-5 w-5" />
          </button>
          {showEmoji && (
            <div className="absolute bottom-12 left-0 z-10 bg-popover border rounded-lg p-2 shadow-lg grid grid-cols-6 gap-1">
              {QUICK_EMOJIS.map((e) => (
                <button key={e} onClick={() => { setBody((b) => b + e); setShowEmoji(false); }} className="text-xl p-1 hover:bg-accent rounded">{e}</button>
              ))}
            </div>
          )}
        </div>
        <textarea
          ref={taRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={placeholder}
          className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button onClick={send} disabled={sending || !body.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}