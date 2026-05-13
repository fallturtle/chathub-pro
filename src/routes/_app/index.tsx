import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { startDm } from "@/lib/chat.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/")({
  component: DmHome,
});

function DmHome() {
  const { user } = useAuth();
  const nav = useNavigate();
  const startDmFn = useServerFn(startDm);
  const [threads, setThreads] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("dm_participants")
      .select("thread_id, dm_threads(id, created_at)")
      .eq("user_id", user.id)
      .then(async ({ data }) => {
        const ids = (data ?? []).map((r: any) => r.thread_id);
        if (!ids.length) return setThreads([]);
        const { data: parts } = await supabase
          .from("dm_participants")
          .select("thread_id, profile:profiles!user_id(id,username,display_name,avatar_color,avatar_url)")
          .in("thread_id", ids)
          .neq("user_id", user.id);
        setThreads(parts ?? []);
      });
  }, [user]);

  useEffect(() => {
    if (!search.trim()) return setResults([]);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_color,avatar_url")
        .ilike("username", `%${search.toLowerCase()}%`)
        .neq("id", user?.id ?? "")
        .limit(10);
      setResults(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [search, user]);

  const open = async (uid: string) => {
    try {
      const { threadId } = await startDmFn({ data: { otherUserId: uid } });
      nav({ to: "/app/dm/$threadId", params: { threadId } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-72 border-r flex flex-col">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Find or start a chat" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {search ? (
            results.map((p) => (
              <button key={p.id} onClick={() => open(p.id)} className="w-full flex items-center gap-2 p-2 rounded hover:bg-accent text-left">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm" style={{ background: p.avatar_color ?? "#7c3aed" }}>{p.username[0]?.toUpperCase()}</div>
                <div>
                  <div className="text-sm font-medium">{p.display_name || p.username}</div>
                  <div className="text-xs text-muted-foreground">@{p.username}</div>
                </div>
              </button>
            ))
          ) : threads.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">No conversations yet. Search above to start one.</p>
          ) : (
            threads.map((t: any) => (
              <Link key={t.thread_id} to="/app/dm/$threadId" params={{ threadId: t.thread_id }} className="flex items-center gap-2 p-2 rounded hover:bg-accent">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm" style={{ background: t.profile?.avatar_color ?? "#7c3aed" }}>{t.profile?.username?.[0]?.toUpperCase()}</div>
                <div className="text-sm font-medium truncate">{t.profile?.display_name || t.profile?.username}</div>
              </Link>
            ))
          )}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto opacity-30" />
          <p className="mt-3">Pick a conversation or start a new one.</p>
        </div>
      </div>
    </div>
  );
}