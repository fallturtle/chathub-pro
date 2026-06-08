import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { SUGGESTED_BLOCKED_WORDS } from "@/lib/blocked-words";
import { Search } from "lucide-react";

export const Route = createFileRoute("/app/s/$spaceId/settings")({
  component: SpaceSettings,
});

const EMOJIS = ["💬","🚀","🎮","🎨","📚","🎵","💻","⚡","🌟","🔥","🌈","🎯"];
const COLORS = ["#7c3aed","#ec4899","#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6"];

function SpaceSettings() {
  const { spaceId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [space, setSpace] = useState<any>(null);
  const [joinCode, setJoinCode] = useState<string>("");
  const [blocked, setBlocked] = useState<any[]>([]);
  const [newWord, setNewWord] = useState("");
  const [filterQ, setFilterQ] = useState("");
  const [showSuggested, setShowSuggested] = useState(false);
  const [rate, setRate] = useState<any>(null);

  const reload = async () => {
    const { data: s } = await supabase.from("spaces").select("*").eq("id", spaceId).maybeSingle();
    setSpace(s);
    const { data: jc } = await supabase.from("space_join_codes").select("join_code").eq("space_id", spaceId).maybeSingle();
    setJoinCode((jc as any)?.join_code ?? "");
    const { data: bw } = await supabase.from("filters_blocked").select("*").eq("space_id", spaceId);
    setBlocked(bw ?? []);
    const { data: r } = await supabase.from("filters_rate").select("*").eq("space_id", spaceId).maybeSingle();
    setRate(r ?? { space_id: spaceId, enabled: false, max_msgs: 5, window_seconds: 10, mute_seconds: 300 });
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [spaceId]);

  if (!space) return <div className="p-8">Loading…</div>;

  const saveSpace = async () => {
    const { error } = await supabase.from("spaces").update({
      name: space.name, description: space.description, icon_emoji: space.icon_emoji, icon_bg: space.icon_bg, icon_url: space.icon_url, visibility: space.visibility,
    }).eq("id", spaceId);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const addBlocked = async (words: string[]) => {
    const rows = words.map((w) => ({ space_id: spaceId, word: w.toLowerCase().trim() })).filter(r => r.word);
    if (!rows.length) return;
    await supabase.from("filters_blocked").insert(rows);
    setNewWord("");
    reload();
  };
  const removeBlocked = async (id: string) => {
    await supabase.from("filters_blocked").delete().eq("id", id);
    reload();
  };

  const saveRate = async () => {
    const { error } = await supabase.from("filters_rate").upsert({ ...rate, space_id: spaceId });
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const deleteSpace = async () => {
    if (!confirm("Permanently delete this space?")) return;
    const { error } = await supabase.from("spaces").delete().eq("id", spaceId);
    if (error) toast.error(error.message);
    else nav({ to: "/app" });
  };

  return (
    <div className="p-6 overflow-y-auto h-full max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">{space.name} — Settings</h1>
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="invites">Invites</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-2xl text-white" style={{ background: space.icon_bg }}>{space.icon_url ? <img src={space.icon_url} className="h-full w-full rounded-2xl object-cover" /> : space.icon_emoji}</div>
            <div className="flex-1 space-y-1">
              <div className="flex gap-1 flex-wrap">{EMOJIS.map((e) => <button key={e} onClick={() => setSpace({ ...space, icon_emoji: e, icon_url: null })} className={`text-lg p-1 rounded ${space.icon_emoji===e?'bg-accent':''}`}>{e}</button>)}</div>
              <div className="flex gap-1">{COLORS.map((c) => <button key={c} onClick={() => setSpace({ ...space, icon_bg: c })} className={`h-6 w-6 rounded-full ${space.icon_bg===c?'ring-2 ring-foreground':''}`} style={{background:c}}/>)}</div>
            </div>
          </div>
          <div><Label>Image URL (optional)</Label><Input value={space.icon_url ?? ""} onChange={(e) => setSpace({ ...space, icon_url: e.target.value || null })} placeholder="https://…" /></div>
          <div><Label>Name</Label><Input value={space.name} onChange={(e) => setSpace({ ...space, name: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea value={space.description ?? ""} onChange={(e) => setSpace({ ...space, description: e.target.value })} /></div>
          <div className="flex items-center justify-between">
            <div><Label>Public</Label><p className="text-xs text-muted-foreground">Listed in browse</p></div>
            <Switch checked={space.visibility === "public"} onCheckedChange={(v) => setSpace({ ...space, visibility: v ? "public" : "private" })} />
          </div>
          <div className="flex gap-2">
            <Button onClick={saveSpace}>Save</Button>
            {space.owner_id === user?.id && <Button variant="destructive" onClick={deleteSpace}>Delete space</Button>}
          </div>
        </TabsContent>
        <TabsContent value="moderation" className="space-y-6">
          <section>
            <h2 className="font-semibold mb-2">Blocked words</h2>
            <p className="text-sm text-muted-foreground mb-2">Matches will be replaced with #### in messages.</p>
            <div className="flex gap-2 mb-2">
              <Input value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="word" onKeyDown={(e) => e.key === "Enter" && addBlocked([newWord])} />
              <Button onClick={() => addBlocked([newWord])}>Add</Button>
              <Button variant="outline" onClick={() => setShowSuggested((v) => !v)}>{showSuggested ? "Hide" : "Browse"} suggested ({SUGGESTED_BLOCKED_WORDS.length})</Button>
            </div>
            <div className="relative mb-2">
              <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={filterQ} onChange={(e) => setFilterQ(e.target.value)} placeholder="Search your blocklist…" className="pl-8 h-8 text-sm" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">{blocked.length} word{blocked.length === 1 ? "" : "s"} blocked · click any to remove</p>
            <div className="flex flex-wrap gap-2">
              {blocked
                .filter((b) => !filterQ || b.word.toLowerCase().includes(filterQ.toLowerCase()))
                .map((b) => (
                <button key={b.id} onClick={() => removeBlocked(b.id)} className="text-xs px-2 py-1 rounded bg-muted hover:bg-destructive hover:text-destructive-foreground">{b.word} ×</button>
              ))}
            </div>
            {showSuggested && (
              <div className="mt-4 border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">Suggested words</h3>
                  <Button size="sm" variant="outline" onClick={() => addBlocked(SUGGESTED_BLOCKED_WORDS.filter((w) => !blocked.some((b) => b.word === w)))}>Add all missing</Button>
                </div>
                <p className="text-xs text-muted-foreground mb-2">Click to add. Already-blocked words are highlighted.</p>
                <div className="max-h-72 overflow-y-auto flex flex-wrap gap-1.5">
                  {SUGGESTED_BLOCKED_WORDS
                    .filter((w) => !filterQ || w.includes(filterQ.toLowerCase()))
                    .map((w) => {
                      const have = blocked.some((b) => b.word === w);
                      return (
                        <button
                          key={w}
                          disabled={have}
                          onClick={() => addBlocked([w])}
                          className={`text-xs px-2 py-1 rounded border ${have ? "bg-primary/20 border-primary text-muted-foreground cursor-default" : "bg-background hover:bg-accent"}`}
                        >{w}{have ? " ✓" : " +"}</button>
                      );
                    })}
                </div>
              </div>
            )}
          </section>
          {rate && (
            <section className="space-y-2">
              <h2 className="font-semibold">Rate limit</h2>
              <div className="flex items-center justify-between">
                <Label>Enabled</Label>
                <Switch checked={rate.enabled} onCheckedChange={(v) => setRate({ ...rate, enabled: v })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Max msgs</Label><Input type="number" value={rate.max_msgs} onChange={(e) => setRate({ ...rate, max_msgs: +e.target.value })} /></div>
                <div><Label>Per seconds</Label><Input type="number" value={rate.window_seconds} onChange={(e) => setRate({ ...rate, window_seconds: +e.target.value })} /></div>
                <div><Label>Mute (sec)</Label><Input type="number" value={rate.mute_seconds} onChange={(e) => setRate({ ...rate, mute_seconds: +e.target.value })} /></div>
              </div>
              <Button onClick={saveRate}>Save rate limit</Button>
            </section>
          )}
        </TabsContent>
        <TabsContent value="invites" className="space-y-3">
          <div>
            <Label>Quick join code</Label>
            <div className="flex gap-2">
              <Input value={joinCode} readOnly />
              <Button onClick={() => navigator.clipboard.writeText(joinCode).then(() => toast.success("Copied"))} disabled={!joinCode}>Copy</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Share with friends — they can join via the join dialog.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}