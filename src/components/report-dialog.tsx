import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export function ReportDialog({
  open, onOpenChange, spaceId, defaultTargetUsername, messageId,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  spaceId: string; defaultTargetUsername?: string; messageId?: string;
}) {
  const { user } = useAuth();
  const [target, setTarget] = useState(defaultTargetUsername ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (!target.trim() || !reason.trim()) return toast.error("Need a user and a reason");
    setBusy(true);
    const uname = target.replace(/^@/, "").trim().toLowerCase();
    const { data: prof } = await supabase.from("profiles").select("id").ilike("username", uname).maybeSingle();
    const { error } = await supabase.from("reports").insert({
      space_id: spaceId, reporter_id: user.id,
      target_user_id: (prof as any)?.id ?? null,
      message_id: messageId ?? null,
      reason: reason.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Report sent to space managers");
    setTarget(""); setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Report a member</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>User</Label><Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="@username" /></div>
          <div><Label>Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What happened?" rows={4} /></div>
          <p className="text-xs text-muted-foreground">Goes to this space's owners and managers. They can escalate it to site admins.</p>
          <Button className="w-full" onClick={submit} disabled={busy}>Send report</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}