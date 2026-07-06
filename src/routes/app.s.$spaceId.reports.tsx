import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/s/$spaceId/reports")({ component: ReportsPage });

function ReportsPage() {
  const { spaceId } = useParams({ from: "/app/s/$spaceId/reports" });
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [escalating, setEscalating] = useState<any | null>(null);
  const [details, setDetails] = useState("");

  const load = async () => {
    const { data } = await supabase.from("reports").select("*").eq("space_id", spaceId).order("created_at", { ascending: false });
    setReports(data ?? []);
  };
  useEffect(() => { load(); }, [spaceId]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this report permanently?")) return;
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setReports((rs) => rs.filter((r) => r.id !== id));
  };

  const escalate = async () => {
    if (!user || !escalating) return;
    if (!details.trim()) return toast.error("Add details for the site admins");
    const { error } = await supabase.from("site_reports").insert({
      source_report_id: escalating.id, space_id: spaceId, escalator_id: user.id,
      target_user_id: escalating.target_user_id, reason: escalating.reason, details: details.trim(),
    });
    if (error) return toast.error(error.message);
    await setStatus(escalating.id, "escalated");
    toast.success("Escalated to site admins");
    setEscalating(null); setDetails("");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-12 border-b flex items-center px-4 gap-2"><AlertTriangle className="h-4 w-4" /><span className="font-semibold">Reports</span></header>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-3xl">
        {reports.length === 0 ? <p className="text-sm text-muted-foreground">No reports.</p> : reports.map((r) => (
          <Card key={r.id} className="p-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{new Date(r.created_at).toLocaleString()}</span>
              <span className="px-2 py-0.5 rounded bg-muted">{r.status}</span>
            </div>
            <div className="text-sm whitespace-pre-wrap">{r.reason}</div>
            <div className="flex gap-2 pt-1 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "resolved")}>Resolve</Button>
              <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "dismissed")}>Dismiss</Button>
              <Button size="sm" variant="outline" onClick={() => setEscalating(r)}><ArrowUpRight className="h-3 w-3 mr-1" />Escalate to site admins</Button>
              <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>Delete</Button>
            </div>
          </Card>
        ))}
      </div>
      <Dialog open={!!escalating} onOpenChange={(o) => { if (!o) { setEscalating(null); setDetails(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Escalate to site admins</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Add details about why this needs site-admin attention.</p>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={5} placeholder="What happened, what you've already tried, screenshots, etc." />
            <Button className="w-full" onClick={escalate}>Send to site admins</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}