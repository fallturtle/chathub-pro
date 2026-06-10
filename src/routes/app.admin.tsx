import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin")({ component: AdminPage });

function AdminPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState({ spaces: 0, users: 0, reports: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      const ok = !!data;
      setIsAdmin(ok);
      if (!ok) return;
      const [r, s, u, sr] = await Promise.all([
        supabase.from("site_reports").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("spaces").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("site_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      setReports(r.data ?? []);
      setStats({ spaces: s.count ?? 0, users: u.count ?? 0, reports: sr.count ?? 0 });
    })();
  }, [user]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("site_reports").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  if (isAdmin === null) return <AppShell><div className="p-6 text-muted-foreground">Loading…</div></AppShell>;
  if (!isAdmin) return (
    <AppShell>
      <div className="p-10 max-w-md mx-auto text-center">
        <Shield className="h-10 w-10 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-bold mt-3">Admins only</h1>
        <p className="text-sm text-muted-foreground mt-1">You don't have site admin access.</p>
        <Link to="/app"><Button className="mt-4" variant="outline">Back to app</Button></Link>
      </div>
    </AppShell>
  );

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto space-y-6 overflow-y-auto">
        <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /><h1 className="text-2xl font-bold">Site admin</h1></div>
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4"><div className="text-xs text-muted-foreground">Spaces</div><div className="text-2xl font-bold">{stats.spaces}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Users</div><div className="text-2xl font-bold">{stats.users}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Open reports</div><div className="text-2xl font-bold">{stats.reports}</div></Card>
        </div>
        <div>
          <h2 className="font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Escalated reports</h2>
          {reports.length === 0 ? <p className="text-sm text-muted-foreground">Nothing escalated yet.</p> : (
            <div className="space-y-2">
              {reports.map((r) => (
                <Card key={r.id} className="p-4 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{new Date(r.created_at).toLocaleString()}</span>
                    <span className="px-2 py-0.5 rounded bg-muted">{r.status}</span>
                  </div>
                  <div className="text-sm font-medium">{r.reason}</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{r.details}</div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "reviewing")}>Mark reviewing</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "resolved")}>Resolve</Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "dismissed")}>Dismiss</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}