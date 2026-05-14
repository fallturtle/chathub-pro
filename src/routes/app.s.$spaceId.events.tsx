import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, MapPin, Plus, Trash2, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/app/s/$spaceId/events")({
  component: EventsPage,
});

function EventsPage() {
  const { spaceId } = Route.useParams();
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, { user_id: string; status: string }[]>>({});
  const [role, setRole] = useState<string>("member");
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("events").select("*").eq("space_id", spaceId).order("starts_at");
    setEvents(data ?? []);
    const ids = (data ?? []).map((e: any) => e.id);
    if (ids.length) {
      const { data: r } = await supabase.from("event_rsvps").select("event_id,user_id,status").in("event_id", ids);
      const g: Record<string, any[]> = {};
      for (const x of r ?? []) (g[x.event_id] ??= []).push(x);
      setRsvps(g);
    }
  };
  useEffect(() => {
    load();
    if (user) supabase.from("space_members").select("role").eq("space_id", spaceId).eq("user_id", user.id).maybeSingle().then(({ data }) => setRole((data as any)?.role ?? "member"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, user]);

  const canManage = role === "owner" || role === "manager";

  const setStatus = async (eventId: string, status: "going" | "maybe" | "no") => {
    if (!user) return;
    await supabase.from("event_rsvps").upsert({ event_id: eventId, user_id: user.id, status });
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete event?")) return;
    await supabase.from("events").delete().eq("id", id);
    load();
  };

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-4 max-w-3xl">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6" />Events</h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New event</Button>
      </div>
      <div className="space-y-3 max-w-3xl">
        {events.length === 0 && <p className="text-muted-foreground">No upcoming events. Create one!</p>}
        {events.map((ev) => {
          const list = rsvps[ev.id] ?? [];
          const going = list.filter((r) => r.status === "going").length;
          const mine = user ? list.find((r) => r.user_id === user.id)?.status : undefined;
          return (
            <div key={ev.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{ev.title}</h3>
                  <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap mt-1">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(ev.starts_at), "MMM d, yyyy · HH:mm")}{ev.ends_at && ` – ${format(new Date(ev.ends_at), "HH:mm")}`}</span>
                    {ev.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.location}</span>}
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{going} going</span>
                  </div>
                  {ev.description && <p className="text-sm mt-2 whitespace-pre-wrap">{ev.description}</p>}
                </div>
                {(canManage || ev.created_by === user?.id) && (
                  <Button size="icon" variant="ghost" onClick={() => remove(ev.id)}><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                {(["going", "maybe", "no"] as const).map((s) => (
                  <Button key={s} size="sm" variant={mine === s ? "default" : "outline"} onClick={() => setStatus(ev.id, s)}>{s === "going" ? "✓ Going" : s === "maybe" ? "? Maybe" : "✗ Can't"}</Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <CreateEventDialog open={open} onOpenChange={setOpen} spaceId={spaceId} userId={user?.id} onCreated={load} />
    </div>
  );
}

function CreateEventDialog({ open, onOpenChange, spaceId, userId, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; spaceId: string; userId?: string; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [loc, setLoc] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const submit = async () => {
    if (!userId || !title || !start) return toast.error("Title and start time required");
    const { error } = await supabase.from("events").insert({
      space_id: spaceId, created_by: userId, title, description: desc, location: loc,
      starts_at: new Date(start).toISOString(), ends_at: end ? new Date(end).toISOString() : null,
    });
    if (error) return toast.error(error.message);
    toast.success("Event created");
    setTitle(""); setDesc(""); setLoc(""); setStart(""); setEnd("");
    onOpenChange(false); onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Starts</Label><Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><Label>Ends (optional)</Label><Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <div><Label>Location</Label><Input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Optional" /></div>
          <div><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <Button className="w-full" onClick={submit}>Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
