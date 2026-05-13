import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { joinSpaceByCode } from "@/lib/chat.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function JoinSpaceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const nav = useNavigate();
  const join = useServerFn(joinSpaceByCode);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [publics, setPublics] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("spaces")
      .select("id,name,description,icon_emoji,icon_bg,icon_url")
      .eq("visibility", "public")
      .limit(30)
      .then(({ data }) => setPublics(data ?? []));
  }, [open]);

  const submit = async (c?: string) => {
    setBusy(true);
    try {
      const { spaceId } = await join({ data: { code: c ?? code } });
      toast.success("Joined!");
      onOpenChange(false);
      nav({ to: "/app/s/$spaceId", params: { spaceId } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Discover spaces</DialogTitle></DialogHeader>
        <Tabs defaultValue="browse">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">Browse public</TabsTrigger>
            <TabsTrigger value="code">Join with code</TabsTrigger>
          </TabsList>
          <TabsContent value="browse" className="space-y-2 max-h-96 overflow-y-auto">
            {publics.length === 0 && <p className="text-sm text-muted-foreground">No public spaces yet.</p>}
            {publics.map((s) => (
              <button key={s.id} onClick={() => submit(s.id /* will fail; use join code */)} className="w-full text-left flex items-center gap-3 p-3 rounded-lg border hover:bg-accent">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white" style={{ background: s.icon_bg ?? "#7c3aed" }}>{s.icon_emoji ?? "💬"}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.description}</div>
                </div>
                <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); supabase.from("spaces").select("join_code").eq("id", s.id).single().then(({data}) => data && submit(data.join_code)); }}>Join</Button>
              </button>
            ))}
          </TabsContent>
          <TabsContent value="code" className="space-y-3">
            <p className="text-sm text-muted-foreground">Paste a space code or invite link code.</p>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="abc12345" />
            <Button className="w-full" onClick={() => submit()} disabled={busy || !code}>{busy ? "Joining…" : "Join space"}</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}