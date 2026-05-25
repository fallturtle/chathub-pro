import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { createBotWebhook, rotateBotWebhook } from "@/lib/bot.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmAction } from "@/components/confirm-action";
import { Bot, Copy, RotateCw, Trash2, Power } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/s/$spaceId/bot")({
  component: BotPage,
});

function BotPage() {
  const { spaceId } = Route.useParams();
  const { user } = useAuth();
  const create = useServerFn(createBotWebhook);
  const rotate = useServerFn(rotateBotWebhook);
  const [role, setRole] = useState<string>("member");
  const [hooks, setHooks] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [channelId, setChannelId] = useState<string>("");
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: h }, { data: c }, { data: m }] = await Promise.all([
      supabase.from("bot_webhooks").select("*").eq("space_id", spaceId).order("created_at", { ascending: false }),
      supabase.from("channels").select("id,name,type").eq("space_id", spaceId).neq("type", "locked").order("position"),
      user ? supabase.from("space_members").select("role").eq("space_id", spaceId).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null } as any),
    ]);
    setHooks(h ?? []);
    setChannels(c ?? []);
    setRole((m as any)?.role ?? "member");
    if (!channelId && (c ?? []).length) setChannelId(c![0].id);
  };
  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [spaceId, user]);

  const canManage = role === "owner" || role === "manager";
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  if (!canManage) {
    return <div className="p-8 text-muted-foreground"><h1 className="text-xl font-bold mb-2 text-foreground">Bot integration</h1>Managers only.</div>;
  }

  const submit = async () => {
    if (!name.trim() || !channelId) return;
    setBusy(true);
    try {
      const res = await create({ data: { spaceId, channelId, name: name.trim() } });
      setRevealed((r) => ({ ...r, [res.id]: res.token }));
      setName("");
      await load();
      toast.success("Bot created — copy the token now");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  const doRotate = async (id: string) => {
    try {
      const r = await rotate({ data: { webhookId: id } });
      setRevealed((x) => ({ ...x, [id]: r.token }));
      toast.success("Token rotated — old token revoked");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bot className="h-6 w-6" /> Bot webhooks</h1>
        <p className="text-sm text-muted-foreground">Each bot gets a unique URL. POST JSON <code className="text-xs bg-muted px-1 rounded">{`{"text":"hello"}`}</code> to post into its channel.</p>
      </div>

      <div className="border rounded-lg p-4 space-y-3 bg-card">
        <h2 className="font-semibold">Create a new bot</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Bot name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="GitHub Bot" /></div>
          <div>
            <Label>Posts in channel</Label>
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger><SelectValue placeholder="Pick channel" /></SelectTrigger>
              <SelectContent>
                {channels.map((c) => <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={submit} disabled={busy || !name.trim() || !channelId}>Create bot</Button>
      </div>

      <div className="space-y-3">
        {hooks.length === 0 && <p className="text-sm text-muted-foreground">No bots yet.</p>}
        {hooks.map((h) => {
          const url = `${origin}/api/public/bot/${revealed[h.id] ?? "<token>"}`;
          const ch = channels.find((c) => c.id === h.channel_id);
          return (
            <div key={h.id} className="border rounded-lg p-4 space-y-2 bg-card">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {h.name}
                    {!h.enabled && <span className="text-xs px-1.5 rounded bg-muted text-muted-foreground">disabled</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">→ #{ch?.name ?? "(channel removed)"}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" title={h.enabled ? "Disable" : "Enable"} onClick={async () => {
                    await supabase.from("bot_webhooks").update({ enabled: !h.enabled }).eq("id", h.id);
                    load();
                  }}><Power className="h-4 w-4" /></Button>
                  <ConfirmAction title="Rotate this bot's token?" description="The current token will stop working immediately. Update wherever it's used." confirmLabel="Rotate" onConfirm={() => doRotate(h.id)}>
                    <Button size="icon" variant="ghost" title="Rotate token"><RotateCw className="h-4 w-4" /></Button>
                  </ConfirmAction>
                  <ConfirmAction title="Delete this bot?" description="The webhook URL will stop working immediately." confirmLabel="Delete bot" onConfirm={async () => {
                    await supabase.from("bot_webhooks").delete().eq("id", h.id);
                    load();
                  }}>
                    <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </ConfirmAction>
                </div>
              </div>
              {revealed[h.id] ? (
                <div className="space-y-1">
                  <Label className="text-xs">Webhook URL (visible once — save it)</Label>
                  <div className="flex gap-1">
                    <Input readOnly value={url} className="font-mono text-xs" />
                    <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success("Copied"); }}><Copy className="h-4 w-4" /></Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Token hidden. Rotate to generate a new one.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}