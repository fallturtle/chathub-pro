import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const CATEGORIES = [
  { v: "harassment", label: "Harassment / bullying" },
  { v: "hate", label: "Hate speech / slurs" },
  { v: "threats", label: "Threats or violence" },
  { v: "sexual", label: "Sexual / NSFW" },
  { v: "spam", label: "Spam / scams" },
  { v: "self-harm", label: "Self-harm / crisis" },
  { v: "impersonation", label: "Impersonation" },
  { v: "other", label: "Something else" },
];
const SEVERITIES = [
  { v: "low", label: "Low" },
  { v: "medium", label: "Medium" },
  { v: "high", label: "High" },
  { v: "urgent", label: "Urgent" },
];

export function ReportDialog({
  open, onOpenChange, spaceId, defaultTargetUsername, messageId, messageBody,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  spaceId: string; defaultTargetUsername?: string; messageId?: string; messageBody?: string;
}) {
  const { user } = useAuth();
  const [target, setTarget] = useState(defaultTargetUsername ?? "");
  const [category, setCategory] = useState("harassment");
  const [severity, setSeverity] = useState("medium");
  const [reason, setReason] = useState(
    messageBody && defaultTargetUsername
      ? `@${defaultTargetUsername} said: "${messageBody.slice(0, 200)}"\n\nWhy this is being reported: `
      : ""
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTarget(defaultTargetUsername ?? "");
      setReason(
        messageBody && defaultTargetUsername
          ? `@${defaultTargetUsername} said: "${messageBody.slice(0, 200)}"\n\nWhy this is being reported: `
          : ""
      );
    }
  }, [open, defaultTargetUsername, messageBody]);

  const submit = async () => {
    if (!user) return;
    if (!target.trim() || !reason.trim()) return toast.error("Need a user and a reason");
    setBusy(true);
    const uname = target.replace(/^@/, "").trim().toLowerCase();
    const { data: prof } = await supabase.from("profiles").select("id").ilike("username", uname).maybeSingle();
    const composed = `[${CATEGORIES.find(c=>c.v===category)?.label} · Severity: ${severity}]\n\n${reason.trim()}`;
    const { error } = await supabase.from("reports").insert({
      space_id: spaceId, reporter_id: user.id,
      target_user_id: (prof as any)?.id ?? null,
      message_id: messageId ?? null,
      reason: composed,
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.v} value={c.v}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What happened?" rows={4} /></div>
          {messageBody && (
            <div className="border-l-2 border-amber-500 pl-2 text-xs bg-muted/40 rounded py-1">
              <strong>Reporting message:</strong>
              <div className="italic opacity-80 whitespace-pre-wrap line-clamp-3">{messageBody}</div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Goes to this space's owners and managers. They can escalate it to site admins.</p>
          <Button className="w-full" onClick={submit} disabled={busy}>Send report</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}