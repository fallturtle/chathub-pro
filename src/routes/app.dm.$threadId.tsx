import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MessageList } from "@/components/message-list";
import { MessageComposer } from "@/components/message-composer";

export const Route = createFileRoute("/app/dm/$threadId")({
  component: DmRoute,
});

function DmRoute() {
  const { threadId } = Route.useParams();
  const { user } = useAuth();
  const [other, setOther] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: part } = await supabase
        .from("dm_participants")
        .select("user_id")
        .eq("thread_id", threadId)
        .neq("user_id", user.id)
        .maybeSingle();
      if (!part) { setOther(null); return; }
      const { data: prof } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_color,avatar_url")
        .eq("id", (part as any).user_id)
        .maybeSingle();
      setOther(prof ?? null);
    })();
    // (legacy embed removed — FK from dm_participants.user_id points to auth.users, not profiles)
    void supabase
      .from("dm_participants")
      .select("thread_id")
      .eq("thread_id", threadId)
      .limit(0);
  }, [threadId, user]);

  return (
    <div className="flex flex-col h-full">
      <header className="border-b px-4 py-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm" style={{ background: other?.avatar_color ?? "#7c3aed" }}>
          {(other?.username ?? "?")[0]?.toUpperCase()}
        </div>
        <div>
          <div className="font-semibold">{other?.display_name || other?.username || "Direct message"}</div>
          <div className="text-xs text-muted-foreground">@{other?.username}</div>
        </div>
      </header>
      <MessageList dmThreadId={threadId} />
      <MessageComposer dmThreadId={threadId} placeholder={`Message @${other?.username ?? ""}`} />
    </div>
  );
}