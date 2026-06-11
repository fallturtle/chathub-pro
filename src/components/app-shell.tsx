import { ReactNode, useEffect, useState } from "react";
import { AppSidebar } from "./app-sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { MessageSquare, Compass, Settings, Bookmark, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [ban, setBan] = useState<any | null | undefined>(undefined);
  const [appealBody, setAppealBody] = useState("");
  const [appealSent, setAppealSent] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default" && !localStorage.getItem("notif-asked")) {
      Notification.requestPermission().finally(() => localStorage.setItem("notif-asked", "1"));
    }
  }, []);

  useEffect(() => {
    if (!user) { setBan(null); return; }
    supabase.from("site_bans" as any).select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => setBan(data ?? null));
    supabase.from("ban_appeals" as any).select("id").eq("user_id", user.id).eq("status", "pending").maybeSingle().then(({ data }) => setAppealSent(!!data));
  }, [user]);

  if (ban === undefined) return <div className="h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;

  if (ban) {
    const submitAppeal = async () => {
      if (!appealBody.trim()) return toast.error("Tell us why this should be reviewed");
      const { error } = await supabase.from("ban_appeals" as any).insert({ user_id: user!.id, body: appealBody.trim() });
      if (error) return toast.error(error.message);
      toast.success("Appeal submitted — site admins will review it");
      setAppealSent(true); setAppealBody("");
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full border rounded-lg p-6 bg-card space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-6 w-6" />
            <h1 className="text-xl font-bold">You've been banned from Atrium</h1>
          </div>
          <div className="text-sm">
            <div className="font-semibold mb-1">Reason given:</div>
            <div className="border-l-2 border-destructive pl-2 italic">{ban.reason}</div>
          </div>
          <div className="text-xs text-muted-foreground">Banned {new Date(ban.banned_at).toLocaleString()}.</div>
          {appealSent ? (
            <div className="text-sm border rounded p-3 bg-muted/40">Your appeal is pending. Site admins will get back to you.</div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-semibold">Appeal this ban</div>
              <Textarea rows={5} value={appealBody} onChange={(e) => setAppealBody(e.target.value)} placeholder="Explain your side. Be honest — this goes to site admins." />
              <Button className="w-full" onClick={submitAppeal}>Submit appeal</Button>
            </div>
          )}
          <Button variant="ghost" className="w-full" onClick={async () => { await signOut(); window.location.href = "/"; }}>Log out</Button>
        </div>
      </div>
    );
  }

  const isActive = (p: string) => path === p || path.startsWith(p + "/");

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="hidden md:flex"><AppSidebar /></div>
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">{children}</main>
      {/* Mobile bottom bar */}
      <nav className="md:hidden border-t bg-sidebar flex items-stretch justify-around shrink-0">
        <MobileTab to="/app" active={path === "/app" || path.startsWith("/app/dm")} Icon={MessageSquare} label="DMs" />
        <MobileTab to="/app" active={false} Icon={Compass} label="Spaces" onClick={() => document.dispatchEvent(new CustomEvent("open-spaces-sheet"))} />
        <MobileTab to="/app/saved" active={isActive("/app/saved")} Icon={Bookmark} label="Saved" />
        <MobileTab to="/app/settings" active={isActive("/app/settings")} Icon={Settings} label="Me" />
      </nav>
    </div>
  );
}

function MobileTab({ to, active, Icon, label, onClick }: { to: string; active: boolean; Icon: any; label: string; onClick?: () => void }) {
  const nav = useNavigate();
  return (
    <button
      onClick={() => { onClick?.(); nav({ to }); }}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${active ? "text-primary" : "text-muted-foreground"}`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );
}