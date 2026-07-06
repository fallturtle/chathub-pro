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
  const [siteOwner, setSiteOwner] = useState<string | null>(null);
  const [bans, setBans] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [banQ, setBanQ] = useState("");
  const [banReason, setBanReason] = useState("");

  const loadAdmins = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("user_id, role, profile:profiles(username, display_name)")
      .eq("role", "admin");
    setAdmins(data ?? []);
  };

  const loadReports = async () => {
    const { data } = await supabase.from("site_reports").select("*").order("created_at", { ascending: false }).limit(100);
    const rows = (data ?? []) as any[];
    const spaceIds = Array.from(new Set(rows.map((r) => r.space_id).filter(Boolean)));
    const userIds = Array.from(new Set(rows.flatMap((r) => [r.escalator_id, r.target_user_id]).filter(Boolean)));
    const srcIds = rows.map((r) => r.source_report_id).filter(Boolean);
    const [sp, us, sr] = await Promise.all([
      spaceIds.length ? supabase.from("spaces").select("id,name,slug,owner_id").in("id", spaceIds) : Promise.resolve({ data: [] as any[] }),
      userIds.length ? supabase.from("profiles").select("id,username,display_name").in("id", userIds) : Promise.resolve({ data: [] as any[] }),
      srcIds.length ? supabase.from("reports").select("id,message_id,reporter_id,target_user_id,reason").in("id", srcIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const spMap = new Map((sp.data ?? []).map((s: any) => [s.id, s]));
    const usMap = new Map((us.data ?? []).map((u: any) => [u.id, u]));
    const srMap = new Map((sr.data ?? []).map((r: any) => [r.id, r]));
    const msgIds = Array.from(new Set([...srMap.values()].map((r: any) => r.message_id).filter(Boolean)));
    const ownerIds = Array.from(new Set([...spMap.values()].map((s: any) => s.owner_id).filter(Boolean)));
    const [msgs, owns, reporterExtra] = await Promise.all([
      msgIds.length ? supabase.from("messages").select("id,body,deleted_at").in("id", msgIds as string[]) : Promise.resolve({ data: [] as any[] }),
      ownerIds.length ? supabase.from("profiles").select("id,username,display_name").in("id", ownerIds as string[]) : Promise.resolve({ data: [] as any[] }),
      (() => {
        const extra = Array.from(new Set([...srMap.values()].flatMap((r: any) => [r.reporter_id, r.target_user_id]).filter(Boolean)));
        return extra.length ? supabase.from("profiles").select("id,username,display_name").in("id", extra as string[]) : Promise.resolve({ data: [] as any[] });
      })(),
    ]);
    const msgMap = new Map((msgs.data ?? []).map((m: any) => [m.id, m]));
    const ownMap = new Map((owns.data ?? []).map((p: any) => [p.id, p]));
    (reporterExtra.data ?? []).forEach((p: any) => usMap.set(p.id, p));
    setReports(rows.map((r) => {
      const src: any = r.source_report_id ? srMap.get(r.source_report_id) : null;
      const space: any = r.space_id ? spMap.get(r.space_id) : null;
      return {
        ...r,
        _space: space,
        _spaceOwner: space?.owner_id ? ownMap.get(space.owner_id) : null,
        _escalator: r.escalator_id ? usMap.get(r.escalator_id) : null,
        _target: r.target_user_id ? usMap.get(r.target_user_id) : (src?.target_user_id ? usMap.get(src.target_user_id) : null),
        _reporter: src?.reporter_id ? usMap.get(src.reporter_id) : null,
        _message: src?.message_id ? msgMap.get(src.message_id) : null,
      };
    }));
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      const ok = !!data;
      setIsAdmin(ok);
      if (!ok) return;
      const [s, u, sr] = await Promise.all([
        supabase.from("spaces").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("site_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      setStats({ spaces: s.count ?? 0, users: u.count ?? 0, reports: sr.count ?? 0 });
      await loadReports();
      loadAdmins();
      const { data: ss } = await supabase.from("site_settings" as any).select("owner_user_id").eq("id", 1).maybeSingle();
      setSiteOwner((ss as any)?.owner_user_id ?? null);
      loadBans();
      loadAppeals();
    })();
  }, [user]);

  const loadBans = async () => {
    const { data } = await supabase.from("site_bans" as any).select("user_id, reason, banned_at, profile:profiles!user_id(username,display_name)").order("banned_at", { ascending: false });
    setBans((data ?? []) as any[]);
  };
  const loadAppeals = async () => {
    const { data } = await supabase.from("ban_appeals" as any).select("*, profile:profiles!user_id(username,display_name)").order("created_at", { ascending: false });
    setAppeals((data ?? []) as any[]);
  };

  const banUser = async () => {
    const q = banQ.trim().replace(/^@/, "");
    if (!q) return;
    const { data: p } = await supabase.from("profiles").select("id").ilike("username", q).maybeSingle();
    if (!p) return toast.error("No user matched");
    const { error } = await supabase.from("site_bans" as any).insert({ user_id: (p as any).id, reason: banReason.trim() || "Violated community guidelines", banned_by: user!.id });
    if (error) return toast.error(error.message);
    toast.success("User banned site-wide");
    setBanQ(""); setBanReason(""); loadBans();
  };
  const unbanUser = async (uid: string) => {
    const { error } = await supabase.from("site_bans" as any).delete().eq("user_id", uid);
    if (error) return toast.error(error.message);
    loadBans();
  };
  const updateAppeal = async (id: string, status: string) => {
    await supabase.from("ban_appeals" as any).update({ status }).eq("id", id);
    loadAppeals();
  };

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
    if (uid === siteOwner) return toast.error("The site owner cannot be removed");
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
                <span>
                  @{a.profile?.username ?? a.user_id.slice(0,8)} <span className="text-muted-foreground">— {a.profile?.display_name}</span>
                  {a.user_id === siteOwner && <span className="ml-2 text-[10px] uppercase font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">Owner</span>}
                </span>
                <Button size="sm" variant="ghost" onClick={() => demote(a.user_id)} disabled={a.user_id === user?.id || a.user_id === siteOwner}>Remove</Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Ban a user site-wide</h2>
          <div className="flex gap-2 flex-wrap">
            <Input value={banQ} onChange={(e) => setBanQ(e.target.value)} placeholder="@username" className="max-w-xs" />
            <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Reason shown to user" className="flex-1 min-w-[200px]" />
            <Button variant="destructive" onClick={banUser} disabled={!banQ.trim()}>Ban</Button>
          </div>
          {bans.length > 0 && (
            <div className="space-y-1 pt-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Active bans</div>
              {bans.map((b: any) => (
                <div key={b.user_id} className="flex items-center justify-between text-sm border rounded px-3 py-1.5">
                  <span>@{b.profile?.username ?? b.user_id.slice(0,8)} <span className="text-muted-foreground">— {b.reason}</span></span>
                  <Button size="sm" variant="ghost" onClick={() => unbanUser(b.user_id)}>Unban</Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {appeals.length > 0 && (
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold">Ban appeals ({appeals.filter((a: any) => a.status === 'pending').length} pending)</h2>
            {appeals.map((a: any) => (
              <div key={a.id} className="border rounded p-3 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>@{a.profile?.username ?? a.user_id.slice(0,8)} · {new Date(a.created_at).toLocaleString()}</span>
                  <span className="px-2 py-0.5 rounded bg-muted">{a.status}</span>
                </div>
                <div className="text-sm whitespace-pre-wrap">{a.body}</div>
                {a.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={async () => { await unbanUser(a.user_id); await updateAppeal(a.id, "approved"); }}>Approve & unban</Button>
                    <Button size="sm" variant="ghost" onClick={() => updateAppeal(a.id, "denied")}>Deny</Button>
                  </div>
                )}
              </div>
            ))}
          </Card>
        )}
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