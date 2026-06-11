import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Hash, Lock, Calendar, Vote, Webhook, Tag, Search, Shield, Sparkles, Bot, ChevronLeft, ChevronRight, Download, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/app" });
  },
  head: () => ({
    meta: [
      { title: "Atrium — Chat for communities" },
      { name: "description", content: "Spaces, channels, DMs, polls, events, and bots — brought to you by The Artistry Hub." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Hash, title: "Channels", desc: "general, announcements, rules, links, and locked password rooms" },
  { icon: MessageSquare, title: "DMs + requests", desc: "Real-time direct messages with accept/decline for unknown senders" },
  { icon: Users, title: "Roles", desc: "Owners, managers, members — promote, demote, ban, mute" },
  { icon: Lock, title: "Locked rooms", desc: "Password-protected channels that auto-relock when you leave" },
  { icon: Calendar, title: "Events", desc: "Schedule community events with RSVP tracking" },
  { icon: Vote, title: "Polls", desc: "Live multi-option polls with real-time results" },
  { icon: Webhook, title: "Webhooks", desc: "Post into channels from any external service as a named bot" },
  { icon: Tag, title: "Custom tags", desc: "Color-coded member tags managed by space owners" },
  { icon: Search, title: "Full message search", desc: "Find anything you've said across an entire space" },
  { icon: Shield, title: "Word filtering", desc: "Automatic profanity & slur filtering, per-space block list" },
  { icon: Sparkles, title: "Slash commands", desc: "/poll, /decision, /question, /todo, /quote, /checkin and more" },
  { icon: Bot, title: "Anonymous forum", desc: "Per-space anonymous Q&A for sensitive discussions" },
  { icon: MessageSquare, title: "Threads & replies", desc: "Quote-reply to keep conversations organized" },
  { icon: MessageSquare, title: "Browser notifications", desc: "Native desktop alerts when you're mentioned" },
  { icon: Sparkles, title: "Linkified messages", desc: "URLs auto-detected and clickable in new tabs" },
  { icon: Lock, title: "Dark mode + themes", desc: "System / dark / light with per-user preference" },
];

function Landing() {
  const [idx, setIdx] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [showBrand, setShowBrand] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % Math.ceil(FEATURES.length / 4)), 10000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    // Reveal "Atrium" word after the logo finishes its slide so nothing peeks out the other side.
    const t = setTimeout(() => setShowBrand(true), 700);
    return () => clearTimeout(t);
  }, []);
  const pageSize = 4;
  const pageCount = Math.ceil(FEATURES.length / pageSize);
  const visible = FEATURES.slice(idx * pageSize, idx * pageSize + pageSize);

  const downloadFeatures = () => {
    const text = "Atrium — Full Feature List\n\n" + FEATURES.map((f) => `• ${f.title} — ${f.desc}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "atrium-features.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2 font-bold text-lg">
          <span className="relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary to-pink-500 text-white">A</span>
          <span className="overflow-hidden inline-block" style={{ width: showBrand ? "auto" : 0 }}>
            {showBrand && <span className="brand-slide-in">Atrium</span>}
          </span>
        </div>
        <div className="flex gap-2">
          <Link to={"/forum" as any}><Button variant="ghost">Forum</Button></Link>
          <Link to="/login"><Button variant="ghost">Log in</Button></Link>
          <Link to="/signup"><Button>Sign up</Button></Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          <span className="hero-animate">Your community,</span><br />
          <span className="hero-animate" style={{ animationDelay: "150ms" }}>all in one space.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">Built like Discord, organized like Google Chat. Spaces, channels, threads, polls, events, DMs, and bots — without the bloat.</p>
        <p className="mt-3 text-sm font-medium tracking-wide text-primary">
          Brought to you by <span className="hub-float">The Artistry Hub</span>
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link to="/signup"><Button size="lg">Get started — it's free</Button></Link>
          <Link to="/login"><Button size="lg" variant="outline">I have an account</Button></Link>
        </div>

        <div className="mt-20">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setIdx((i) => (i - 1 + pageCount) % pageCount)} className="p-2 rounded hover:bg-accent" aria-label="Previous"><ChevronLeft className="h-5 w-5" /></button>
            <div className="flex gap-1.5">
              {Array.from({ length: pageCount }).map((_, i) => (
                <button key={i} onClick={() => setIdx(i)} className={`h-2 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-2 bg-muted"}`} aria-label={`Page ${i + 1}`} />
              ))}
            </div>
            <button onClick={() => setIdx((i) => (i + 1) % pageCount)} className="p-2 rounded hover:bg-accent" aria-label="Next"><ChevronRight className="h-5 w-5" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 transition-opacity">
            {visible.map((f) => (
              <div key={f.title} className="rounded-lg border p-5 text-left bg-card">
                <f.icon className="h-5 w-5 text-primary" />
                <div className="mt-3 font-semibold">{f.title}</div>
                <div className="text-sm text-muted-foreground">{f.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => setShowAll((s) => !s)}><List className="h-4 w-4 mr-2" />{showAll ? "Hide" : "Show"} all features</Button>
            <Button variant="outline" onClick={downloadFeatures}><Download className="h-4 w-4 mr-2" />Download features list</Button>
            <Link to={"/forum" as any}><Button variant="outline"><MessageSquare className="h-4 w-4 mr-2" />Visit community forum</Button></Link>
          </div>
          {showAll && (
            <div className="mt-6 text-left border rounded-lg p-5 bg-card">
              <h3 className="font-semibold mb-3">All {FEATURES.length} features</h3>
              <ul className="space-y-2 text-sm">
                {FEATURES.map((f) => (
                  <li key={f.title} className="flex gap-2">
                    <f.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span><strong>{f.title}</strong> — <span className="text-muted-foreground">{f.desc}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}