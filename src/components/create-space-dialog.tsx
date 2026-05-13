import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const EMOJIS = ["💬", "🚀", "🎮", "🎨", "📚", "🎵", "💻", "⚡", "🌟", "🔥", "🌈", "🎯"];
const COLORS = ["#7c3aed", "#ec4899", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6"];

export function CreateSpaceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [emoji, setEmoji] = useState("💬");
  const [color, setColor] = useState("#7c3aed");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user || !name.trim()) return;
    setLoading(true);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) + "-" + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase
      .from("spaces")
      .insert({
        name: name.trim(),
        slug,
        description: desc,
        owner_id: user.id,
        icon_emoji: emoji,
        icon_bg: color,
        visibility: isPublic ? "public" : "private",
      })
      .select("id")
      .single();
    setLoading(false);
    if (error || !data) return toast.error(error?.message || "Failed");
    toast.success("Space created");
    onOpenChange(false);
    setName(""); setDesc("");
    nav({ to: "/app/s/$spaceId", params: { spaceId: data.id } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new space</DialogTitle>
          <DialogDescription>Your community's home. You can change everything later.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-2xl text-white" style={{ background: color }}>{emoji}</div>
            <div className="flex-1 space-y-1">
              <div className="flex gap-1 flex-wrap">{EMOJIS.map((e) => <button key={e} onClick={() => setEmoji(e)} className={`text-lg p-1 rounded ${emoji===e?'bg-accent':''}`}>{e}</button>)}</div>
              <div className="flex gap-1">{COLORS.map((c) => <button key={c} onClick={() => setColor(c)} className={`h-6 w-6 rounded-full ${color===c?'ring-2 ring-foreground':''}`} style={{background:c}}/>)}</div>
            </div>
          </div>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My awesome community" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Public space</Label>
              <p className="text-xs text-muted-foreground">Listed in browse, anyone can join</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <Button className="w-full" onClick={submit} disabled={loading || !name.trim()}>
            {loading ? "Creating…" : "Create space"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}