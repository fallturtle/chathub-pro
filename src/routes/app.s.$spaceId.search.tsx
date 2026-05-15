import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/app/s/$spaceId/search")({
  component: SearchPage,
});

function SearchPage() {
  const { spaceId } = Route.useParams();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [profs, setProfs] = useState<Record<string, any>>({});

  const run = async () => {
    if (!q.trim()) return;
    setBusy(true);
    // Get channels in space
    const { data: chans } = await supabase.from("channels").select("id,name").eq("space_id", spaceId);
    const cMap: Record<string, any> = {};
    for (const c of chans ?? []) cMap[c.id] = c;
    const cids = (chans ?? []).map((c) => c.id);
    if (!cids.length) { setResults([]); setBusy(false); return; }
    // Use websearch tsquery via search column
    const { data, error } = await supabase
      .from("messages")
      .select("id,body,author_id,created_at,channel_id")
      .in("channel_id", cids)
      .textSearch("search", q, { type: "websearch", config: "english" })
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      // fallback: ilike
      const { data: data2 } = await supabase
        .from("messages").select("id,body,author_id,created_at,channel_id")
        .in("channel_id", cids).ilike("body", `%${q}%`).order("created_at", { ascending: false }).limit(50);
      setResults((data2 ?? []).map((m: any) => ({ ...m, channel: cMap[m.channel_id] })));
    } else {
      setResults((data ?? []).map((m: any) => ({ ...m, channel: cMap[m.channel_id] })));
    }
    const ids = Array.from(new Set((data ?? []).map((m: any) => m.author_id)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id,username,display_name,avatar_color").in("id", ids);
      const m: Record<string, any> = {};
      for (const p of ps ?? []) m[p.id] = p;
      setProfs(m);
    }
    setBusy(false);
  };

  return (
    <div className="p-6 overflow-y-auto h-full max-w-3xl mx-auto w-full">
      <h1 className="text-xl font-bold mb-4 flex items-center gap-2"><Search className="h-5 w-5" /> Search messages</h1>
      <div className="flex gap-2 mb-4">
        <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} placeholder="Search this space…" autoFocus />
        <Button onClick={run} disabled={busy || !q.trim()}>Search</Button>
      </div>
      <div className="space-y-2">
        {results.map((m) => {
          const p = profs[m.author_id];
          return (
            <Link key={m.id} to="/app/s/$spaceId/c/$channelId" params={{ spaceId, channelId: m.channel_id }} className="block p-3 rounded border bg-card hover:bg-accent">
              <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{p?.display_name || p?.username || "…"}</span>
                <span>in #{m.channel?.name}</span>
                <span>· {m.created_at ? format(new Date(m.created_at), "MMM d, HH:mm") : ""}</span>
              </div>
              <div className="text-sm mt-1 whitespace-pre-wrap break-words">{m.body}</div>
            </Link>
          );
        })}
        {!busy && results.length === 0 && q && <p className="text-sm text-muted-foreground">No results</p>}
      </div>
    </div>
  );
}
