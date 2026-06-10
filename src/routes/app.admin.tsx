import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Shield, AlertTriangle, ArrowLeft, UserPlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin")({ component: AdminPage });

function AdminPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState({ spaces: 0, users: 0, reports: 0 });
  const [promoteQ, setPromoteQ] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);

  const loadAdmins = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("user_id, role, profile:profiles(username, display_name)")
      .eq("role", "admin");
    setAdmins(data ?? []);
  };

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
      loadAdmins();
    })();
  }, [user]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("site_reports").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const promote = async () => {
    const q = promoteQ.trim().replace(/^@/, "");
    if (!q) return;
    setPromoting(true);
    try {
      let targetId: string | null = null;
      // try by username
      const { data: p } = await supabase.from("profiles").select("id").ilike("username", q).maybeSingle();
      if (p) targetId = (p as any).id;
      if (!targetId) return toast.error("No user matched. (Lookup by email coming soon — use username for now.)");
      const { error } = await supabase.from("user_roles").insert({ user_id: targetId, role: "admin" });
      if (error && !error.message.toLowerCase().includes("duplicate")) return toast.error(error.message);
      toast.success("Promoted to site admin");
      setPromoteQ("");
      loadAdmins();
    } finally { setPromoting(false); }
  };

  const demote = async (uid: string) => {
    if (uid === user?.id) return toast.error("You can't demote yourself");
    const { error } = await supabase.from("user_roles").delete().match({ user_id: uid, role: "admin" });
    if (error) return toast.error(error.message);
    toast.success("Removed admin");
    loadAdmins();
  };

  if (isAdmin === null) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!isAdmin) return (
      <div className="p-10 max-w-md mx-auto text-center">
        <Shield className="h-10 w-10 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-bold mt-3">Admins only</h1>
        <p className="text-sm text-muted-foreground mt-1">You don't have site admin access.</p>
        <Link to="/app"><Button className="mt-4" variant="outline">Back to app</Button></Link>
      </div>
  );

  return (
      <div className="p-6 max-w-5xl mx-auto space-y-6 overflow-y-auto w-full">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /><h1 className="text-2xl font-bold">Site admin</h1></div>
          <Button variant="outline" size="sm" onClick={() => nav({ to: "/app" })}><ArrowLeft className="h-4 w-4 mr-1" /> Back to app</Button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4"><div className="text-xs text-muted-foreground">Spaces</div><div className="text-2xl font-bold">{stats.spaces}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Users</div><div className="text-2xl font-bold">{stats.users}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Open reports</div><div className="text-2xl font-bold">{stats.reports}</div></Card>
        </div>
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4" /> Site admins</h2>
          <div className="flex gap-2">
            <Input value={promoteQ} onChange={(e) => setPromoteQ(e.target.value)} placeholder="Promote by username (e.g. micah)" />
            <Button onClick={promote} disabled={promoting || !promoteQ.trim()}>Promote</Button>
          </div>
          <div className="space-y-1">
            {admins.map((a) => (
              <div key={a.user_id} className="flex items-center justify-between text-sm border rounded px-3 py-1.5">
                <span>@{a.profile?.username ?? a.user_id.slice(0,8)} <span className="text-muted-foreground">— {a.profile?.display_name}</span></span>
                <Button size="sm" variant="ghost" onClick={() => demote(a.user_id)} disabled={a.user_id === user?.id}>Remove</Button>
              </div>
            ))}
          </div>
        </Card>
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
  );
}