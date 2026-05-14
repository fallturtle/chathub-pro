import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { startDm } from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/app/s/$spaceId/members")({
  component: MembersPage,
});

function MembersPage() {
  const { spaceId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const startDmFn = useServerFn(startDm);
  const [members, setMembers] = useState<any[]>([]);
  const [myRole, setMyRole] = useState<string>("member");

  const load = async () => {
    const { data } = await supabase.from("space_members").select("user_id, role, banned, muted_until, profile:profiles!user_id(id,username,display_name,avatar_color)").eq("space_id", spaceId);
    setMembers(data ?? []);
  };
  useEffect(() => {
    load();
    if (user) supabase.from("space_members").select("role").eq("space_id", spaceId).eq("user_id", user.id).maybeSingle().then(({ data }) => setMyRole((data as any)?.role ?? "member"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, user]);

  const canManage = myRole === "owner" || myRole === "manager";
  const isOwner = myRole === "owner";

  const setRole = async (uid: string, role: string) => {
    const { error } = await supabase.from("space_members").update({ role: role as any }).match({ space_id: spaceId, user_id: uid });
    if (error) toast.error(error.message); else { toast.success("Updated"); load(); }
  };
  const ban = async (uid: string) => {
    if (!confirm("Ban this user?")) return;
    await supabase.from("space_members").update({ banned: true }).match({ space_id: spaceId, user_id: uid });
    load();
  };
  const unban = async (uid: string) => {
    await supabase.from("space_members").update({ banned: false }).match({ space_id: spaceId, user_id: uid });
    load();
  };
  const kick = async (uid: string) => {
    if (!confirm("Remove from space?")) return;
    await supabase.from("space_members").delete().match({ space_id: spaceId, user_id: uid });
    load();
  };
  const dm = async (uid: string) => {
    try { const { threadId } = await startDmFn({ data: { otherUserId: uid } }); nav({ to: "/app/dm/$threadId", params: { threadId } }); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  const owners = members.filter((m) => m.role === "owner");
  const managers = members.filter((m) => m.role === "manager");
  const regulars = members.filter((m) => m.role === "member");

  const roleBadge = (role: string) => {
    if (role === "owner") return <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-400 to-orange-500 text-white">Owner</span>;
    if (role === "manager") return <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-gradient-to-r from-primary to-pink-500 text-white">Manager</span>;
    return null;
  };

  const renderMember = (m: any) => (
    <div key={m.user_id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ background: m.profile?.avatar_color ?? "#7c3aed" }}>
        {m.profile?.username?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium flex items-center gap-2 flex-wrap">
          <span className="truncate">{m.profile?.display_name || m.profile?.username}</span>
          {roleBadge(m.role)}
          {m.banned && <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground">Banned</span>}
          {m.muted_until && new Date(m.muted_until) > new Date() && <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted">Muted</span>}
        </div>
        <div className="text-xs text-muted-foreground truncate">@{m.profile?.username}</div>
      </div>
      {m.user_id !== user?.id && (
        <div className="flex gap-1 shrink-0">
          <Button size="sm" variant="ghost" onClick={() => dm(m.user_id)}>DM</Button>
          {canManage && m.role !== "owner" && (
            <>
              {isOwner && (
                m.role === "manager"
                  ? <Button size="sm" variant="ghost" onClick={() => setRole(m.user_id, "member")}>Demote</Button>
                  : <Button size="sm" variant="ghost" onClick={() => setRole(m.user_id, "manager")}>Promote</Button>
              )}
              {m.banned
                ? <Button size="sm" variant="ghost" onClick={() => unban(m.user_id)}>Unban</Button>
                : <Button size="sm" variant="ghost" onClick={() => ban(m.user_id)}>Ban</Button>}
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => kick(m.user_id)}>Kick</Button>
            </>
          )}
        </div>
      )}
    </div>
  );

  const Section = ({ title, list }: { title: string; list: any[] }) => (
    list.length === 0 ? null : (
      <div className="space-y-2">
        <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground px-1">{title} — {list.length}</h2>
        <div className="space-y-2">{list.map(renderMember)}</div>
      </div>
    )
  );

  return (
    <div className="p-6 overflow-y-auto h-full">
      <h1 className="text-xl font-bold mb-6">Members ({members.length})</h1>
      <div className="space-y-6 max-w-3xl">
        <Section title="Owners" list={owners} />
        <Section title="Managers" list={managers} />
        <Section title="Members" list={regulars} />
      </div>
    </div>
  );
}