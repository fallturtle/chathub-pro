import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Plus, Compass, MessageSquare, Settings, LogOut, Search, Bookmark, Shield, Puzzle } from "lucide-react";
import { CreateSpaceDialog } from "./create-space-dialog";
import { JoinSpaceDialog } from "./join-space-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type Space = {
  id: string;
  name: string;
  slug: string;
  icon_emoji: string | null;
  icon_bg: string | null;
  icon_url: string | null;
};

export function AppSidebar() {
  const { user, profile, signOut } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openJoin, setOpenJoin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("space_members")
        .select("space:spaces(id,name,slug,icon_emoji,icon_bg,icon_url)")
        .eq("user_id", user.id);
      const list = (data ?? [])
        .map((r: any) => r.space)
        .filter(Boolean) as Space[];
      setSpaces(list);
    };
    load();
    const ch = supabase
      .channel("sm-" + user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "space_members", filter: `user_id=eq.${user.id}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const isActive = (id: string) => path.includes(`/app/s/${id}`);

  return (
    <aside className="flex h-full">
      {/* Spaces rail */}
      <div className="w-[72px] bg-sidebar border-r flex flex-col items-center py-3 gap-2 overflow-y-auto">
        <Link to="/app" title="Direct messages">
          <div
            className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${
              path === "/app" || path.startsWith("/app/dm")
                ? "bg-primary text-primary-foreground rounded-xl"
                : "bg-sidebar-accent text-sidebar-foreground hover:rounded-xl hover:bg-primary hover:text-primary-foreground"
            }`}
          >
            <MessageSquare className="h-5 w-5" />
          </div>
        </Link>
        <div className="h-px w-8 bg-border my-1" />
        {spaces.map((s) => (
          <Link key={s.id} to="/app/s/$spaceId" params={{ spaceId: s.id }} title={s.name}>
            <div
              className={`h-12 w-12 flex items-center justify-center text-xl font-bold transition-all overflow-hidden ${
                isActive(s.id) ? "rounded-xl ring-2 ring-primary" : "rounded-2xl hover:rounded-xl"
              }`}
              style={{ background: s.icon_bg ?? "#7c3aed", color: "white" }}
            >
              {s.icon_url ? (
                <img src={s.icon_url} alt={s.name} className="h-full w-full object-cover" />
              ) : (
                <span>{s.icon_emoji ?? s.name.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
          </Link>
        ))}
        <button
          onClick={() => setOpenCreate(true)}
          title="Create space"
          className="h-12 w-12 rounded-2xl bg-sidebar-accent text-green-500 flex items-center justify-center hover:rounded-xl hover:bg-green-500 hover:text-white transition-all"
        >
          <Plus className="h-5 w-5" />
        </button>
        <button
          onClick={() => setOpenJoin(true)}
          title="Join / Browse"
          className="h-12 w-12 rounded-2xl bg-sidebar-accent text-sidebar-foreground flex items-center justify-center hover:rounded-xl hover:bg-primary hover:text-primary-foreground transition-all"
        >
          <Compass className="h-5 w-5" />
        </button>
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-white"
              style={{ background: profile?.avatar_color ?? "#7c3aed" }}
              title={profile?.username}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (profile?.username ?? "?").slice(0, 1).toUpperCase()
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end">
            <div className="px-2 py-1.5 text-sm">
              <div className="font-medium">{profile?.display_name || profile?.username}</div>
              <div className="text-muted-foreground text-xs">@{profile?.username}</div>
            </div>
            <DropdownMenuItem onClick={() => nav({ to: "/app/settings" })}>
              <Settings className="h-4 w-4 mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => nav({ to: "/app/saved" })}>
              <Bookmark className="h-4 w-4 mr-2" /> Saved messages
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => nav({ to: "/app/plugins" })}>
              <Puzzle className="h-4 w-4 mr-2" /> Plugins & add-ons
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => nav({ to: "/app/admin" })}>
                <Shield className="h-4 w-4 mr-2" /> Site admin
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={async () => {
                await signOut();
                nav({ to: "/" });
              }}
            >
              <LogOut className="h-4 w-4 mr-2" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CreateSpaceDialog open={openCreate} onOpenChange={setOpenCreate} />
      <JoinSpaceDialog open={openJoin} onOpenChange={setOpenJoin} />
    </aside>
  );
}