import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageList } from "./message-list";
import { MessageComposer, type ReplyTarget } from "./message-composer";
import { ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Parent = {
  id: string; body: string; author_id: string; created_at: string | null;
  reply_count: number; last_reply_at: string | null;
};

export function ThreadsPanel({
  open, onOpenChange, channelId, spaceId, blockedWords, canManage,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  channelId: string; spaceId: string;
  blockedWords: string[]; canManage: boolean;
}) {
  const [parents, setParents] = useState<Parent[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [active, setActive] = useState<Parent | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyTarget>(null);

  useEffect(() => {
    if (!open) return;
    setActive(null);
    (async () => {
      // load all messages then derive parents with replies
      const { data: kids } = await supabase
        .from("messages")
        .select("parent_id, created_at")
        .eq("channel_id", channelId)
        .not("parent_id", "is", null);
      const counts = new Map<string, { count: number; last: string }>();
      for (const k of kids ?? []) {
        const pid = (k as any).parent_id as string;
        const cur = counts.get(pid) ?? { count: 0, last: "" };
        cur.count++;
        if (!cur.last || (k as any).created_at > cur.last) cur.last = (k as any).created_at;
        counts.set(pid, cur);
      }
      const ids = Array.from(counts.keys());
      if (!ids.length) { setParents([]); return; }
      const { data: top } = await supabase
        .from("messages").select("id,body,author_id,created_at")
        .in("id", ids);
      const list: Parent[] = (top ?? []).map((m: any) => ({
        ...m,
        reply_count: counts.get(m.id)!.count,
        last_reply_at: counts.get(m.id)!.last,
      })).sort((a, b) => (b.last_reply_at ?? "").localeCompare(a.last_reply_at ?? ""));
      setParents(list);
      const authorIds = Array.from(new Set(list.map((m) => m.author_id)));
      const { data: profs } = await supabase.from("profiles").select("id,username,display_name,avatar_url,avatar_color").in("id", authorIds);
      const pm: Record<string, any> = {};
      for (const p of profs ?? []) pm[(p as any).id] = p;
      setProfiles(pm);
    })();
  }, [open, channelId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            {active && (
              <button onClick={() => setActive(null)} className="p-1 hover:bg-accent rounded"><ArrowLeft className="h-4 w-4" /></button>
            )}
            {active ? "Thread" : "Threads"}
          </SheetTitle>
        </SheetHeader>
        {active ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="border-b p-3 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">
                {profiles[active.author_id]?.display_name || profiles[active.author_id]?.username || "user"}
              </div>
              <div className="text-sm whitespace-pre-wrap">{active.body}</div>
            </div>
            <MessageList
              channelId={channelId}
              spaceId={spaceId}
              parentId={active.id}
              blockedWords={blockedWords}
              canManage={canManage}
              onReply={setReplyTo}
            />
            <MessageComposer
              channelId={channelId}
              spaceId={spaceId}
              canManageCustom={canManage}
              placeholder="Reply in thread…"
              replyTo={replyTo ?? { id: active.id, body: active.body, authorName: profiles[active.author_id]?.display_name || profiles[active.author_id]?.username || "user" }}
              onClearReply={() => setReplyTo(null)}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {parents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center p-8">No threads in this channel yet. Reply to a message to start one.</p>
            )}
            {parents.map((p) => {
              const prof = profiles[p.author_id];
              return (
                <button key={p.id} onClick={() => setActive(p)} className="w-full text-left px-4 py-3 border-b hover:bg-accent">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <strong className="text-foreground">{prof?.display_name || prof?.username || "user"}</strong>
                    <span>· {p.last_reply_at ? formatDistanceToNow(new Date(p.last_reply_at), { addSuffix: true }) : ""}</span>
                  </div>
                  <div className="text-sm line-clamp-2">{p.body}</div>
                  <div className="text-xs text-primary mt-1">{p.reply_count} {p.reply_count === 1 ? "reply" : "replies"}</div>
                </button>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}