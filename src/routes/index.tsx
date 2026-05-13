import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Hash, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/app" });
  },
  head: () => ({
    meta: [
      { title: "Nexus — Chat for communities" },
      { name: "description", content: "Spaces, channels, DMs, and bots in one place." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2 font-bold text-lg">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">N</span>
          Nexus
        </div>
        <div className="flex gap-2">
          <Link to="/login"><Button variant="ghost">Log in</Button></Link>
          <Link to="/signup"><Button>Sign up</Button></Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          Your community,<br />all in one space.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
          Built like Discord, organized like Google Chat. Spaces, channels, threads, polls, events, DMs, and bots — without the bloat.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link to="/signup"><Button size="lg">Get started — it's free</Button></Link>
          <Link to="/login"><Button size="lg" variant="outline">I have an account</Button></Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
          {[
            { icon: Hash, title: "Channels", desc: "general, announcements, rules, links, locked" },
            { icon: MessageSquare, title: "DMs", desc: "Real-time direct messages" },
            { icon: Users, title: "Roles", desc: "Owners, managers, members" },
            { icon: Lock, title: "Locked rooms", desc: "Password-protected channels" },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border p-5 text-left">
              <f.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-semibold">{f.title}</div>
              <div className="text-sm text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}