import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { startDm } from "@/lib/chat.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

const cache = new Map<string, any>();

export function ProfileCard({ userId, children }: { userId: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const startDmFn = useServerFn(startDm);
  const [p, setP] = useState<any>(cache.get(userId) ?? null);

  useEffect(() => {
    if (cache.has(userId)) return;
    supabase.from("profiles").select("id,username,display_name,avatar_url,avatar_color,description,status_emoji,status_text")
      .eq("id", userId).maybeSingle().then(({ data }) => {
        if (data) { cache.set(userId, data); setP(data); }
      });
  }, [userId]);

  const dm = async () => {
    try { const { threadId } = await startDmFn({ data: { otherUserId: userId } }); nav({ to: "/app/dm/$threadId", params: { threadId } }); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-72" align="start">
        {!p ? <div className="text-sm text-muted-foreground">Loading…</div> : (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full overflow-hidden flex items-center justify-center text-white text-xl font-bold shrink-0" style={{ background: p.avatar_color ?? "#7c3aed" }}>
                {p.avatar_url ? <img src={p.avatar_url} className="h-full w-full object-cover" /> : (p.username?.[0]?.toUpperCase())}
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">{p.display_name || p.username}</div>
                <div className="text-xs text-muted-foreground truncate">@{p.username}</div>
              </div>
            </div>
            {(p.status_emoji || p.status_text) && (
              <div className="text-xs flex items-center gap-1.5 bg-muted/50 rounded px-2 py-1">
                <span>{p.status_emoji}</span><span className="truncate">{p.status_text}</span>
              </div>
            )}
            {p.description && <p className="text-xs text-muted-foreground line-clamp-3">{p.description}</p>}
            {user && user.id !== userId && (
              <Button size="sm" className="w-full" onClick={dm}><MessageSquare className="h-3 w-3 mr-1" /> Send message</Button>
            )}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}