import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Puzzle, Sparkles, Palette, MessageSquare, Dice5, Info } from "lucide-react";

export const Route = createFileRoute("/app/plugins")({ component: PluginsPage });

type Plugin = {
  id: string;
  name: string;
  desc: string;
  by: string;
  builtin: true;
  icon: any;
  adds: string[];
};

const BUILTIN: Plugin[] = [
  { id: "core-commands", name: "Core commands", by: "Atrium", builtin: true, icon: MessageSquare,
    desc: "The basics: /decision, /question, /todo, /poll, /help, /clear, /report.",
    adds: ["/decision", "/question", "/todo", "/poll", "/help", "/clear", "/report"] },
  { id: "fun-pack", name: "Fun pack", by: "Atrium", builtin: true, icon: Dice5,
    desc: "Silly stuff for chill channels: coin flips, dice rolls, magic 8-ball, action text.",
    adds: ["/me", "/shrug", "/flip", "/roll", "/8ball"] },
  { id: "writer-pack", name: "Writer pack", by: "Atrium", builtin: true, icon: Sparkles,
    desc: "Formatting helpers for well-structured messages.",
    adds: ["/quote", "/checkin", "/fact"] },
  { id: "themes", name: "Extra themes", by: "Atrium", builtin: true, icon: Palette,
    desc: "Extra per-user color themes beyond dark/light. Applied from Settings → Theme.",
    adds: [] },
];

const KEY = "plugins:enabled";
function getEnabled(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function setEnabled(next: Record<string, boolean>) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  window.dispatchEvent(new CustomEvent("atrium:plugins-changed"));
}

function PluginsPage() {
  const [enabled, setEn] = useState<Record<string, boolean>>({});
  useEffect(() => { setEn(getEnabled()); }, []);
  const toggle = (id: string, v: boolean) => {
    const next = { ...enabled, [id]: v };
    setEn(next); setEnabled(next);
  };
  const isOn = (id: string) => enabled[id] !== false; // default on

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4 overflow-y-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Puzzle className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Plugins & add-ons</h1>
        </div>
        <Link to="/app"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Extend Atrium with extra commands, themes, and emoji. Built-in packs are managed here — third-party add-ons are coming soon.
      </p>

      <div className="space-y-3">
        {BUILTIN.map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{p.name}</h3>
                    <span className="text-[10px] uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded">Built-in</span>
                    {p.id === "core-commands" && <span className="text-[10px] uppercase tracking-wide bg-primary/15 text-primary px-1.5 py-0.5 rounded">Required</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">by {p.by}</div>
                  <p className="text-sm mt-1">{p.desc}</p>
                  {p.adds.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {p.adds.map((a) => <code key={a} className="text-[11px] bg-muted rounded px-1.5 py-0.5">{a}</code>)}
                    </div>
                  )}
                </div>
                <Switch
                  checked={p.id === "core-commands" ? true : isOn(p.id)}
                  disabled={p.id === "core-commands"}
                  onCheckedChange={(v) => toggle(p.id, v)}
                />
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <h2 className="font-semibold flex items-center gap-2"><Info className="h-4 w-4" /> Build your own add-on</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Third-party plugins are on the roadmap. Every add-on is a small JSON manifest plus a set of slash-command handlers
          that receive the raw args and return a message body. The runtime is sandboxed — plugins can't read your DMs, tokens,
          or other users' data.
        </p>
        <pre className="text-[11px] bg-muted rounded p-3 mt-2 overflow-x-auto"><code>{`{
  "id": "my-pack",
  "name": "My command pack",
  "version": "1.0.0",
  "author": "@you",
  "commands": [
    {
      "name": "hype",
      "desc": "Hype up a channel",
      "handler": "return '🔥 ' + args.toUpperCase() + ' 🔥'"
    }
  ]
}`}</code></pre>
        <p className="text-xs text-muted-foreground mt-2">
          When third-party plugins ship, you'll be able to install them from a URL or from the Atrium marketplace, and toggle
          them on/off per-account here. Nothing to do today.
        </p>
      </Card>
    </div>
  );
}