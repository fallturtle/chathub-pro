import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Bot, Plus, Trash2, Power, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmAction } from "@/components/confirm-action";
import { toast } from "sonner";

export const Route = createFileRoute("/app/s/$spaceId/bots")({
  component: BotsPage,
});

type Webhook = { id: string; name: string; channel_id: string | null; enabled: boolean };
type Rule = { id: string; webhook_id: string; trigger: string; response: string; match_type: string; enabled: boolean };

function BotsPage() {
  const { spaceId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState("member");
  const [hooks, setHooks] = useState<Webhook[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [selected, setSelected] = useState<string>("");

  const load = async () => {
    const [{ data: h }, { data: m }] = await Promise.all([
      supabase.from("bot_webhooks").select("id,name,channel_id,enabled").eq("space_id", spaceId).order("name"),
      user ? supabase.from("space_members").select("role").eq("space_id", spaceId).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null } as any),
    ]);
    setHooks((h ?? []) as any);
    setRole((m as any)?.role ?? "member");
    if (!selected && (h ?? []).length) setSelected(h![0].id);
  };
  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [spaceId, user]);

  useEffect(() => {
    if (!selected) { setRules([]); return; }
    supabase.from("bot_rules").select("*").eq("webhook_id", selected).order("created_at")
      .then(({ data }) => setRules((data ?? []) as any));
  }, [selected]);

  const canManage = role === "owner" || role === "manager";
  if (!canManage) {
    return <div className="p-8 text-muted-foreground"><h1 className="text-xl font-bold mb-2 text-foreground">Bots</h1>Managers only.</div>;
  }

  const addRule = async () => {
    if (!selected) return;
    const { error } = await supabase.from("bot_rules").insert({
      webhook_id: selected, trigger: "hello", response: "Hi there! 👋", match_type: "contains", enabled: true,
    });
    if (error) return toast.error(error.message);
    supabase.from("bot_rules").select("*").eq("webhook_id", selected).order("created_at").then(({ data }) => setRules((data ?? []) as any));
  };
  const updateRule = async (id: string, patch: Partial<Rule>) => {
    setRules((rs) => rs.map((r) => r.id === id ? { ...r, ...patch } : r));
    await supabase.from("bot_rules").update(patch).eq("id", id);
  };
  const deleteRule = async (id: string) => {
    setRules((rs) => rs.filter((r) => r.id !== id));
    await supabase.from("bot_rules").delete().eq("id", id);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bot className="h-6 w-6" /> Bots</h1>
        <p className="text-sm text-muted-foreground">Build no-code bots from rules: when someone says <em>X</em>, the bot replies <em>Y</em>. Each bot is tied to a webhook (which controls its name, avatar, and channel).</p>
      </div>

      {hooks.length === 0 ? (
        <div className="border rounded-lg p-6 text-center bg-card">
          <p className="text-sm text-muted-foreground mb-3">You need a webhook first — that's the bot's identity (name + channel).</p>
          <Button onClick={() => nav({ to: "/app/s/$spaceId/bot", params: { spaceId } })}>Create a webhook</Button>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label>Bot</Label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger><SelectValue placeholder="Pick a bot" /></SelectTrigger>
                <SelectContent>
                  {hooks.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}{!h.enabled && " (disabled)"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addRule} disabled={!selected}><Plus className="h-4 w-4 mr-1" /> Add rule</Button>
          </div>

          <div className="space-y-3">
            {rules.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No rules yet. Click "Add rule" to make the bot respond to keywords.</p>}
            {rules.map((r) => (
              <div key={r.id} className="border rounded-lg p-4 space-y-2 bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary font-medium">WHEN</span>
                  <Select value={r.match_type} onValueChange={(v) => updateRule(r.id, { match_type: v })}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">contains</SelectItem>
                      <SelectItem value="starts">starts with</SelectItem>
                      <SelectItem value="exact">is exactly</SelectItem>
                      <SelectItem value="regex">matches regex</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={r.trigger} onChange={(e) => updateRule(r.id, { trigger: e.target.value })} className="flex-1 h-8 text-sm" placeholder="trigger text" />
                  <Button size="icon" variant="ghost" title={r.enabled ? "Disable" : "Enable"} onClick={() => updateRule(r.id, { enabled: !r.enabled })} className={r.enabled ? "" : "opacity-40"}>
                    <Power className="h-4 w-4" />
                  </Button>
                  <ConfirmAction title="Delete this rule?" onConfirm={() => deleteRule(r.id)}>
                    <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </ConfirmAction>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium mt-1.5 flex items-center gap-1"><ArrowRight className="h-3 w-3" /> REPLY</span>
                  <textarea
                    value={r.response}
                    onChange={(e) => updateRule(r.id, { response: e.target.value })}
                    rows={2}
                    className="flex-1 text-sm p-2 rounded border bg-background resize-none"
                    placeholder="What the bot says back"
                  />
                </div>
              </div>
            ))}
          </div>

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium">Tips & ideas</summary>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li>Use <em>contains</em> for casual triggers ("good morning"), <em>exact</em> for commands ("!ping").</li>
              <li>Multiple rules can fire per message — handy for FAQs.</li>
              <li>Rules only run in the bot's bound channel. Change that on the Webhooks page.</li>
              <li>Coming soon: variables like <code>{"{user}"}</code>, scheduled posts, and external API actions.</li>
            </ul>
          </details>
        </>
      )}
    </div>
  );
}