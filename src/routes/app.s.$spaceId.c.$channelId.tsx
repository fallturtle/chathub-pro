import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { unlockChannel, setChannelPassword } from "@/lib/chat.functions";
import { MessageList } from "@/components/message-list";
import { MessageComposer } from "@/components/message-composer";
import { Hash, Megaphone, BookOpen, Link as LinkIcon, Lock, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/s/$spaceId/c/$channelId")({
  component: ChannelRoute,
});

const ICONS: Record<string, any> = { general: Hash, announcement: Megaphone, rules: BookOpen, links: LinkIcon, locked: Lock };

function ChannelRoute() {
  const { spaceId, channelId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const unlock = useServerFn(unlockChannel);
  const [channel, setChannel] = useState<any>(null);
  const [role, setRole] = useState<string>("member");
  const [hasAccess, setHasAccess] = useState(false);
  const [pwd, setPwd] = useState("");
  const [blocked, setBlocked] = useState<string[]>([]);
  const [editOpen, setEditOpen] = useState(false);

  const reload = async () => {
    const { data } = await supabase.from("channels").select("*").eq("id", channelId).maybeSingle();
    setChannel(data);
  };

  useEffect(() => {
    if (!user) return;
    reload();
    supabase.from("space_members").select("role").eq("space_id", spaceId).eq("user_id", user.id).maybeSingle().then(({ data }) => setRole((data as any)?.role ?? "member"));
    supabase.from("channel_access").select("user_id").eq("channel_id", channelId).eq("user_id", user.id).maybeSingle().then(({ data }) => setHasAccess(!!data));
    supabase.from("filters_blocked").select("word").eq("space_id", spaceId).then(({ data }) => setBlocked((data ?? []).map((r: any) => r.word)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, spaceId, user]);

  if (!channel) return <div className="p-8 text-muted-foreground">Loading…</div>;

  const Icon = ICONS[channel.type] ?? Hash;
  const canManage = role === "owner" || role === "manager";
  const isLocked = channel.type === "locked" && !hasAccess && !canManage;
  const isAnnouncement = channel.type === "announcement";
  const canPost = !isLocked && (!isAnnouncement || canManage);

  const tryUnlock = async () => {
    try {
      await unlock({ data: { channelId, password: pwd } });
      setHasAccess(true);
      toast.success("Unlocked");
    } catch (e: any) {
      toast.error(e?.message ?? "Wrong password");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="border-b px-4 py-3 flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold flex items-center gap-2">
            {channel.name}
            {channel.type !== "general" && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{channel.type}</span>}
          </div>
          {channel.topic && <div className="text-xs text-muted-foreground truncate">{channel.topic}</div>}
        </div>
        {canManage && (
          <>
            <Button size="icon" variant="ghost" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /></Button>
            {channel.type !== "general" && (
              <Button size="icon" variant="ghost" onClick={async () => {
                if (!confirm("Delete this channel?")) return;
                const { error } = await supabase.from("channels").delete().eq("id", channelId);
                if (error) toast.error(error.message);
                else nav({ to: "/app/s/$spaceId", params: { spaceId } });
              }}><Trash2 className="h-4 w-4" /></Button>
            )}
          </>
        )}
      </header>

      {isLocked ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-sm text-center space-y-3">
            <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
            <h2 className="font-semibold text-lg">This channel is locked</h2>
            <p className="text-sm text-muted-foreground">Enter the password to unlock.</p>
            <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && tryUnlock()} />
            <Button onClick={tryUnlock} className="w-full" disabled={!pwd}>Unlock</Button>
          </div>
        </div>
      ) : channel.type === "rules" || channel.type === "links" ? (
        <RulesOrLinksView channel={channel} canManage={canManage} onSaved={reload} />
      ) : (
        <>
          <MessageList channelId={channelId} blockedWords={blocked} canManage={canManage} />
          <MessageComposer
            channelId={channelId}
            disabled={!canPost}
            placeholder={isAnnouncement ? "Announcement…" : `Message #${channel.name}`}
            blockedWords={blocked}
          />
        </>
      )}

      <EditChannelDialog open={editOpen} onOpenChange={setEditOpen} channel={channel} onSaved={reload} />
    </div>
  );
}

function RulesOrLinksView({ channel, canManage, onSaved }: { channel: any; canManage: boolean; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(channel.body?.text ?? "");

  useEffect(() => { setBody(channel.body?.text ?? ""); }, [channel.id, channel.body]);

  const save = async () => {
    const { error } = await supabase.from("channels").update({ body: { text: body } }).eq("id", channel.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(false);
    onSaved();
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        {editing ? (
          <div className="space-y-3">
            <Textarea rows={20} value={body} onChange={(e) => setBody(e.target.value)} placeholder={channel.type === "rules" ? "1. Be kind\n2. No spam\n…" : "https://example.com — important link"} />
            <div className="flex gap-2">
              <Button onClick={save}>Save</Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <>
            <article className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {body || <span className="text-muted-foreground">{canManage ? "Click edit to add content." : "Nothing here yet."}</span>}
            </article>
            {canManage && <Button className="mt-4" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4 mr-2" />Edit</Button>}
          </>
        )}
      </div>
    </div>
  );
}

function EditChannelDialog({ open, onOpenChange, channel, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; channel: any; onSaved: () => void }) {
  const [name, setName] = useState(channel.name);
  const [topic, setTopic] = useState(channel.topic ?? "");
  const [pwd, setPwd] = useState("");
  const setPassword = useServerFn(setChannelPassword);
  useEffect(() => { setName(channel.name); setTopic(channel.topic ?? ""); setPwd(""); }, [channel.id]);
  const save = async () => {
    const slug = name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 32);
    const { error } = await supabase.from("channels").update({ name: slug, topic }).eq("id", channel.id);
    if (error) return toast.error(error.message);
    if (channel.type === "locked" && pwd) {
      try { await setPassword({ data: { channelId: channel.id, password: pwd } }); }
      catch (e: any) { return toast.error(e?.message ?? "Failed to set password"); }
    }
    toast.success("Channel updated");
    onOpenChange(false);
    onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit channel</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-sm font-medium">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="text-sm font-medium">Topic</label><Input value={topic} onChange={(e) => setTopic(e.target.value)} /></div>
          {channel.type === "locked" && (
            <div>
              <label className="text-sm font-medium">{channel.password_hash ? "Change password" : "Set password"}</label>
              <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Leave blank to keep" />
            </div>
          )}
          <Button className="w-full" onClick={save}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}