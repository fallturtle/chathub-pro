import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { startDm } from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tag, Check } from "lucide-react";

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
  const [tags, setTags] = useState<any[]>([]);
  const [memberTags, setMemberTags] = useState<Record<string, string[]>>({});

  const load = async () => {
    const { data } = await supabase.from("space_members").select("user_id, role, banned, muted_until").eq("space_id", spaceId);
    const list = data ?? [];
    const ids = list.map((m: any) => m.user_id);
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,username,display_name,avatar_color").in("id", ids);
      const map: Record<string, any> = {};
      for (const p of profs ?? []) map[p.id] = p;
      setMembers(list.map((m: any) => ({ ...m, profile: map[m.user_id] })));
    } else {
      setMembers(list);
    }
    const { data: mt } = await supabase.from("member_tags").select("user_id, tag_id").eq("space_id", spaceId);
    const mg: Record<string, string[]> = {};
    for (const r of mt ?? []) (mg[r.user_id] ??= []).push(r.tag_id);
    setMemberTags(mg);
    const { data: tg } = await supabase.from("custom_tags").select("*").eq("space_id", spaceId).order("label");
    setTags(tg ?? []);
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

  const toggleTag = async (uid: string, tagId: string) => {
    const has = (memberTags[uid] ?? []).includes(tagId);
    if (has) await supabase.from("member_tags").delete().match({ space_id: spaceId, user_id: uid, tag_id: tagId });
    else await supabase.from("member_tags").insert({ space_id: spaceId, user_id: uid, tag_id: tagId, assigned_by: user?.id });
    load();
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
          {(memberTags[m.user_id] ?? []).map((tid) => {
            const t = tags.find((x) => x.id === tid);
            if (!t) return null;
            return <span key={tid} className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded text-white" style={{ background: t.color }}>{t.label}</span>;
          })}
          {m.banned && <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground">Banned</span>}
          {m.muted_until && new Date(m.muted_until) > new Date() && <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted">Muted</span>}
        </div>
        <div className="text-xs text-muted-foreground truncate">@{m.profile?.username}</div>
      </div>
      {m.user_id !== user?.id ? (
        <div className="flex gap-1 shrink-0">
          <Button size="sm" variant="ghost" onClick={() => dm(m.user_id)}>DM</Button>
          {canManage && (
            <>
              {tags.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="ghost"><Tag className="h-4 w-4" /></Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 p-1">
                    <div className="text-xs text-muted-foreground px-2 py-1">Assign tags</div>
                    {tags.map((t) => {
                      const on = (memberTags[m.user_id] ?? []).includes(t.id);
                      return (
                        <button key={t.id} onClick={() => toggleTag(m.user_id, t.id)} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded text-sm">
                          <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
                          <span className="flex-1 text-left">{t.label}</span>
                          {on && <Check className="h-3 w-3" />}
                        </button>
                      );
                    })}
                  </PopoverContent>
                </Popover>
              )}
              {isOwner && m.role === "owner" && <Button size="sm" variant="ghost" onClick={() => setRole(m.user_id, "manager")}>Demote owner</Button>}
              {isOwner && m.role === "manager" && <Button size="sm" variant="ghost" onClick={() => setRole(m.user_id, "owner")}>Make owner</Button>}
              {m.role === "manager" && <Button size="sm" variant="ghost" onClick={() => setRole(m.user_id, "member")}>Demote</Button>}
              {m.role === "member" && <Button size="sm" variant="ghost" onClick={() => setRole(m.user_id, "manager")}>Promote</Button>}
              {m.role !== "owner" && (
                <>
                  {m.banned
                    ? <Button size="sm" variant="ghost" onClick={() => unban(m.user_id)}>Unban</Button>
                    : <Button size="sm" variant="ghost" onClick={() => ban(m.user_id)}>Ban</Button>}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => kick(m.user_id)}>Kick</Button>
                </>
              )}
            </>
          )}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground shrink-0">You</span>
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