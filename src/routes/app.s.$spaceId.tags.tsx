import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tag, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/s/$spaceId/tags")({
  component: TagsPage,
});

const COLORS = ["#7c3aed","#ec4899","#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6"];

function TagsPage() {
  const { spaceId } = Route.useParams();
  const { user } = useAuth();
  const [tags, setTags] = useState<any[]>([]);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [role, setRole] = useState("member");

  const load = async () => {
    const { data } = await supabase.from("custom_tags").select("*").eq("space_id", spaceId).order("label");
    setTags(data ?? []);
  };
  useEffect(() => {
    load();
    if (user) supabase.from("space_members").select("role").eq("space_id", spaceId).eq("user_id", user.id).maybeSingle().then(({ data }) => setRole((data as any)?.role ?? "member"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, user]);

  const canManage = role === "owner" || role === "manager";

  const add = async () => {
    if (!label.trim() || !user) return;
    const { error } = await supabase.from("custom_tags").insert({ space_id: spaceId, user_id: user.id, label: label.trim(), color });
    if (error) return toast.error(error.message);
    setLabel(""); load();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("custom_tags").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="p-6 overflow-y-auto h-full max-w-2xl mx-auto w-full">
      <h1 className="text-xl font-bold mb-4 flex items-center gap-2"><Tag className="h-5 w-5" /> Custom tags</h1>
      <p className="text-sm text-muted-foreground mb-4">Tags managers create here can be used to label members and channels.</p>
      {canManage && (
        <div className="flex gap-2 mb-6 items-end">
          <div className="flex-1">
            <label className="text-xs">Label</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="VIP, Mod, Verified…" onKeyDown={(e) => e.key === "Enter" && add()} />
          </div>
          <div>
            <label className="text-xs block mb-1">Color</label>
            <div className="flex gap-1">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full ${color === c ? "ring-2 ring-foreground" : ""}`} style={{ background: c }} />
              ))}
            </div>
          </div>
          <Button onClick={add} disabled={!label.trim()}>Add</Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 && <p className="text-sm text-muted-foreground">No tags yet.</p>}
        {tags.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ background: t.color }}>
            {t.label}
            {canManage && <button onClick={() => remove(t.id)} className="hover:opacity-80"><X className="h-3 w-3" /></button>}
          </span>
        ))}
      </div>
    </div>
  );
}
