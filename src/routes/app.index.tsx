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

export const Route = createFileRoute("/app/")({
  component: DmHome,
});

function DmHome() {
  const { user } = useAuth();
  const nav = useNavigate();
  const startDmFn = useServerFn(startDm);
  const [threads, setThreads] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);

  const loadThreads = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("dm_participants")
      .select("thread_id, accepted")
      .eq("user_id", user.id);
    const rows = data ?? [];
    const ids = rows.map((r: any) => r.thread_id);
    if (!ids.length) { setThreads([]); setRequests([]); return; }
    const acceptedById = new Map(rows.map((r: any) => [r.thread_id, r.accepted]));
    const { data: parts } = await supabase
      .from("dm_participants")
      .select("thread_id, profile:profiles!user_id(id,username,display_name,avatar_color,avatar_url)")
      .in("thread_id", ids)
      .neq("user_id", user.id);
    const list = (parts ?? []).map((p: any) => ({ ...p, accepted: acceptedById.get(p.thread_id) }));
    setThreads(list.filter((t: any) => t.accepted));
    setRequests(list.filter((t: any) => !t.accepted));
  };

  useEffect(() => { loadThreads(); /* eslint-disable-next-line */ }, [user]);

  const accept = async (threadId: string) => {
    if (!user) return;
    await supabase.from("dm_participants").update({ accepted: true }).match({ thread_id: threadId, user_id: user.id });
    loadThreads();
  };
  const decline = async (threadId: string) => {
    if (!user) return;
    // Just remove your participation; admin/cleanup left to cron later
    await supabase.from("dm_participants").delete().match({ thread_id: threadId, user_id: user.id });
    loadThreads();
  };

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
          ) : threads.length === 0 && requests.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">No conversations yet. Search above to start one.</p>
          ) : (
            <>
              {requests.length > 0 && (
                <>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-2 pt-2">Message requests — {requests.length}</div>
                  {requests.map((t: any) => (
                    <div key={t.thread_id} className="p-2 rounded border bg-accent/30 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm" style={{ background: t.profile?.avatar_color ?? "#7c3aed" }}>{t.profile?.username?.[0]?.toUpperCase()}</div>
                        <div className="text-sm font-medium truncate flex-1">{t.profile?.display_name || t.profile?.username}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => accept(t.thread_id)}>Accept</Button>
                        <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs" onClick={() => decline(t.thread_id)}>Decline</Button>
                      </div>
                    </div>
                  ))}
                  <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-2 pt-2">Direct messages</div>
                </>
              )}
              {threads.map((t: any) => (
                <Link key={t.thread_id} to="/app/dm/$threadId" params={{ threadId: t.thread_id }} className="flex items-center gap-2 p-2 rounded hover:bg-accent">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm" style={{ background: t.profile?.avatar_color ?? "#7c3aed" }}>{t.profile?.username?.[0]?.toUpperCase()}</div>
                  <div className="text-sm font-medium truncate">{t.profile?.display_name || t.profile?.username}</div>
                </Link>
              ))}
            </>
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