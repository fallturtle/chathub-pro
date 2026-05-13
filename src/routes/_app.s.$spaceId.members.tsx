import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { startDm } from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/s/$spaceId/members")({
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

  return (
    <div className="p-6 overflow-y-auto h-full">
      <h1 className="text-xl font-bold mb-4">Members ({members.length})</h1>
      <div className="space-y-2 max-w-3xl">
        {members.sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : 0)).map((m) => (
          <div key={m.user_id} className="flex items-center gap-3 p-3 rounded-lg border">
            <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: m.profile?.avatar_color ?? "#7c3aed" }}>
              {m.profile?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="font-medium">{m.profile?.display_name || m.profile?.username} <span className="text-xs px-1.5 py-0.5 rounded bg-muted ml-1">{m.role}</span>{m.banned && <span className="text-xs ml-1 text-destructive">banned</span>}</div>
              <div className="text-xs text-muted-foreground">@{m.profile?.username}</div>
            </div>
            {m.user_id !== user?.id && (
              <div className="flex gap-1">
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
        ))}
      </div>
    </div>
  );
}