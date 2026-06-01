import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { setChannelPassword } from "@/lib/chat.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Hash, Megaphone, BookOpen, Link as LinkIcon, Lock, Plus, Settings, Users, Calendar, Bot, ChevronDown, Search, Tag, MessageCircle, Webhook } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmAction } from "@/components/confirm-action";
import { toast } from "sonner";

export const Route = createFileRoute("/app/s/$spaceId")({
  component: SpaceLayout,
});

const ICONS: Record<string, any> = {
  general: Hash,
  announcement: Megaphone,
  rules: BookOpen,
  links: LinkIcon,
  locked: Lock,
};

function SpaceLayout() {
  const { spaceId } = Route.useParams();
  const { user } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const nav = useNavigate();
  const [space, setSpace] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [role, setRole] = useState<string>("member");
  const [createOpen, setCreateOpen] = useState(false);
  const [joinCode, setJoinCode] = useState<string>("");

  const reloadChannels = async () => {
    const { data } = await supabase.from("channels").select("*").eq("space_id", spaceId).order("position");
    setChannels(data ?? []);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("spaces").select("*").eq("id", spaceId).maybeSingle().then(({ data }) => setSpace(data));
    reloadChannels();
    supabase.from("space_members").select("role").eq("space_id", spaceId).eq("user_id", user.id).maybeSingle().then(({ data }) => setRole((data as any)?.role ?? "member"));
    supabase.from("space_join_codes").select("join_code").eq("space_id", spaceId).maybeSingle().then(({ data }) => setJoinCode((data as any)?.join_code ?? ""));
    const ch = supabase
      .channel(`sp-${spaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "channels", filter: `space_id=eq.${spaceId}` }, reloadChannels)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, user]);

  const canManage = role === "owner" || role === "manager";
  const isChannel = (cid: string) => path.includes(`/c/${cid}`);

  // Auto-redirect to first general channel if at space root
  useEffect(() => {
    if (channels.length && path === `/app/s/${spaceId}`) {
      const first = channels.find((c) => c.type === "general") ?? channels[0];
      nav({ to: "/app/s/$spaceId/c/$channelId", params: { spaceId, channelId: first.id }, replace: true });
    }
  }, [channels, path, spaceId, nav]);

  return (
    <div className="flex h-full">
      <aside className="w-60 border-r flex flex-col bg-sidebar">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="px-4 py-3 border-b font-bold text-left flex items-center justify-between hover:bg-sidebar-accent">
              <span className="truncate">{space?.name ?? "…"}</span>
              <ChevronDown className="h-4 w-4 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {canManage && <DropdownMenuItem onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Create channel</DropdownMenuItem>}
            <DropdownMenuItem onClick={() => nav({ to: "/app/s/$spaceId/members", params: { spaceId } })}><Users className="h-4 w-4 mr-2" />Members</DropdownMenuItem>
            <DropdownMenuItem onClick={() => nav({ to: "/app/s/$spaceId/events", params: { spaceId } })}><Calendar className="h-4 w-4 mr-2" />Events</DropdownMenuItem>
            <DropdownMenuItem onClick={() => nav({ to: "/app/s/$spaceId/search", params: { spaceId } })}><Search className="h-4 w-4 mr-2" />Search messages</DropdownMenuItem>
            <DropdownMenuItem onClick={() => nav({ to: "/app/s/$spaceId/tags", params: { spaceId } })}><Tag className="h-4 w-4 mr-2" />Custom tags</DropdownMenuItem>
            <DropdownMenuItem onClick={() => nav({ to: "/app/s/$spaceId/forum", params: { spaceId } })}><MessageCircle className="h-4 w-4 mr-2" />Forum</DropdownMenuItem>
            <DropdownMenuItem onClick={() => nav({ to: "/app/s/$spaceId/bot", params: { spaceId } })}><Webhook className="h-4 w-4 mr-2" />Webhooks</DropdownMenuItem>
            <DropdownMenuItem onClick={() => nav({ to: "/app/s/$spaceId/bots" as any, params: { spaceId } })}><Bot className="h-4 w-4 mr-2" />Bots</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(joinCode).then(() => toast.success("Copied join code"))} disabled={!joinCode}>Copy join code</DropdownMenuItem>
            {canManage && <DropdownMenuItem onClick={() => nav({ to: "/app/s/$spaceId/settings", params: { spaceId } })}><Settings className="h-4 w-4 mr-2" />Settings</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <ConfirmAction
              title="Leave this space?"
              description="You'll lose access to all channels here. You can rejoin later if it's public or you have a join code."
              confirmLabel="Leave"
              onConfirm={async () => {
                await supabase.from("space_members").delete().match({ space_id: spaceId, user_id: user!.id });
                nav({ to: "/app" });
              }}
            >
              <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>Leave space</DropdownMenuItem>
            </ConfirmAction>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {channels.map((c) => {
            const Icon = ICONS[c.type] ?? Hash;
            const active = isChannel(c.id);
            return (
              <Link
                key={c.id}
                to="/app/s/$spaceId/c/$channelId"
                params={{ spaceId, channelId: c.id }}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{c.name}</span>
              </Link>
            );
          })}
          {canManage && (
            <button onClick={() => setCreateOpen(true)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground">
              <Plus className="h-4 w-4" /> Add channel
            </button>
          )}
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <Outlet />
      </div>
      <CreateChannelDialog open={createOpen} onOpenChange={setCreateOpen} spaceId={spaceId} onCreated={reloadChannels} />
    </div>
  );
}

function CreateChannelDialog({ open, onOpenChange, spaceId, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; spaceId: string; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"general" | "announcement" | "rules" | "links" | "locked">("general");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const setPasswordFn = useServerFn(setChannelPassword);

  const submit = async () => {
    if (type === "locked" && !pwd.trim()) return toast.error("Locked channels require a password");
    setBusy(true);
    const slug = name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 32);
    const { data: created, error } = await supabase.from("channels").insert({ space_id: spaceId, name: slug || "channel", type }).select("id").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    if (type === "locked" && created?.id) {
      try { await setPasswordFn({ data: { channelId: created.id, password: pwd } }); }
      catch (e: any) { toast.error(e?.message ?? "Could not set password"); }
    }
    toast.success("Channel created");
    setName(""); setType("general"); setPwd("");
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create channel</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="random" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General — everyone can chat</SelectItem>
                <SelectItem value="announcement">Announcement — managers only post</SelectItem>
                <SelectItem value="rules">Rules — pinned content</SelectItem>
                <SelectItem value="links">Links — important links</SelectItem>
                <SelectItem value="locked">Locked — password protected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === "locked" && (
            <div>
              <Label>Password</Label>
              <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Required for locked channels" />
            </div>
          )}
          <Button className="w-full" onClick={submit} disabled={busy || !name.trim()}>Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}