import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bookmark, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/saved")({ component: SavedPage });

function SavedPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bookmarks")
      .select("id, note, created_at, message:messages(id, body, author_id, channel_id, dm_thread_id, created_at)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as any[];
    // Enrich with channel/space/author info
    const channelIds = Array.from(new Set(rows.map((r) => r.message?.channel_id).filter(Boolean)));
    const dmIds = Array.from(new Set(rows.map((r) => r.message?.dm_thread_id).filter(Boolean)));
    const authorIds = Array.from(new Set(rows.map((r) => r.message?.author_id).filter(Boolean)));
    const [ch, dms, profs] = await Promise.all([
      channelIds.length ? supabase.from("channels").select("id,name,space_id,space:spaces(id,name)").in("id", channelIds) : Promise.resolve({ data: [] as any[] }),
      dmIds.length ? supabase.from("dm_participants").select("thread_id, profile:profiles!user_id(username,display_name)").in("thread_id", dmIds).neq("user_id", user.id) : Promise.resolve({ data: [] as any[] }),
      authorIds.length ? supabase.from("profiles").select("id,username,display_name").in("id", authorIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const chMap = new Map((ch.data ?? []).map((c: any) => [c.id, c]));
    const dmMap = new Map((dms.data ?? []).map((d: any) => [d.thread_id, d.profile]));
    const profMap = new Map((profs.data ?? []).map((p: any) => [p.id, p]));
    setItems(rows.map((r) => ({
      ...r,
      _channel: r.message?.channel_id ? chMap.get(r.message.channel_id) : null,
      _dmOther: r.message?.dm_thread_id ? dmMap.get(r.message.dm_thread_id) : null,
      _author: r.message?.author_id ? profMap.get(r.message.author_id) : null,
    })));
  };
  useEffect(() => { load(); }, [user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("bookmarks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((i) => i.filter((x) => x.id !== id));
  };

  return (
      <div className="p-6 max-w-3xl mx-auto space-y-4 overflow-y-auto w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Bookmark className="h-5 w-5 text-primary" /><h1 className="text-2xl font-bold">Saved messages</h1></div>
          <Button variant="outline" size="sm" onClick={() => nav({ to: "/app" })}><ArrowLeft className="h-4 w-4 mr-1" /> Back to app</Button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing saved yet. Hover a message and click the bookmark icon.</p>
        ) : items.map((b) => {
          const source = b._channel
            ? `${b._channel.space?.name ?? "Space"} · #${b._channel.name}`
            : b._dmOther
              ? `DM with @${b._dmOther.username}`
              : "Unknown";
          const goto = () => {
            if (b._channel) nav({ to: "/app/s/$spaceId/c/$channelId", params: { spaceId: b._channel.space_id, channelId: b._channel.id } });
            else if (b.message?.dm_thread_id) nav({ to: "/app/dm/$threadId", params: { threadId: b.message.dm_thread_id } });
          };
          return (
            <Card key={b.id} className="p-4 hover:bg-accent/30 transition-colors">
              <div className="flex justify-between items-start gap-3">
                <button onClick={goto} className="text-left flex-1 min-w-0">
                  <div className="text-xs font-semibold text-primary mb-1">{source}</div>
                  <div className="text-sm whitespace-pre-wrap break-words">{b.message?.body ?? "(deleted)"}</div>
                  {b._author && <div className="text-xs text-muted-foreground mt-1">— {b._author.display_name || `@${b._author.username}`}</div>}
                </button>
                <Button size="icon" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="text-xs text-muted-foreground mt-2">Saved {new Date(b.created_at).toLocaleString()}</div>
            </Card>
          );
        })}
      </div>
  );
}