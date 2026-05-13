import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MessageList } from "@/components/message-list";
import { MessageComposer } from "@/components/message-composer";

export const Route = createFileRoute("/_app/dm/$threadId")({
  component: DmRoute,
});

function DmRoute() {
  const { threadId } = Route.useParams();
  const { user } = useAuth();
  const [other, setOther] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("dm_participants")
      .select("profile:profiles!user_id(id,username,display_name,avatar_color)")
      .eq("thread_id", threadId)
      .neq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setOther((data as any)?.profile));
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