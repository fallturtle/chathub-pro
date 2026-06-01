import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, applyTheme, getStoredTheme, setStoredTheme } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({
  component: UserSettings,
});

const COLORS = ["#7c3aed","#ec4899","#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6"];

function UserSettings() {
  const { profile, user, refreshProfile } = useAuth();
  const [form, setForm] = useState<any>(null);

  useEffect(() => { if (profile) setForm({ ...profile, theme_pref: getStoredTheme() }); }, [profile]);
  if (!form) return <div className="p-8">Loading…</div>;

  const sendPasswordReset = async () => {
    if (!user?.email) return toast.error("No email on file");
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent — check your inbox");
  };

  const save = async () => {
    const { error } = await supabase.from("profiles").update({
      display_name: form.display_name,
      description: form.description,
      avatar_color: form.avatar_color,
      avatar_url: form.avatar_url || null,
      status_emoji: form.status_emoji,
      status_text: form.status_text,
    }).eq("id", user!.id);
    if (error) return toast.error(error.message);
    setStoredTheme(form.theme_pref);
    applyTheme(form.theme_pref);
    await refreshProfile();
    toast.success("Saved");
  };

  return (
    <div className="p-6 overflow-y-auto h-full max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Your settings</h1>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden" style={{ background: form.avatar_color }}>
            {form.avatar_url ? <img src={form.avatar_url} className="h-full w-full object-cover" /> : (form.username?.[0]?.toUpperCase())}
          </div>
          <div className="flex gap-1">{COLORS.map((c) => <button key={c} onClick={() => setForm({ ...form, avatar_color: c })} className={`h-7 w-7 rounded-full ${form.avatar_color===c?'ring-2 ring-foreground':''}`} style={{background:c}}/>)}</div>
        </div>
        <div><Label>Avatar URL</Label><Input value={form.avatar_url ?? ""} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://…" /></div>
        <div><Label>Username</Label><Input value={form.username} disabled /></div>
        <div><Label>Display name</Label><Input value={form.display_name ?? ""} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div>
        <div><Label>Bio</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid grid-cols-3 gap-2">
          <div><Label>Status emoji</Label><Input value={form.status_emoji ?? ""} onChange={(e) => setForm({ ...form, status_emoji: e.target.value })} placeholder="🟢" /></div>
          <div className="col-span-2"><Label>Status text</Label><Input value={form.status_text ?? ""} onChange={(e) => setForm({ ...form, status_text: e.target.value })} placeholder="Working on…" /></div>
        </div>
        <div>
          <Label>Theme</Label>
          <Select value={form.theme_pref} onValueChange={(v: any) => setForm({ ...form, theme_pref: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System default</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={save}>Save</Button>
        <div className="pt-4 border-t mt-6">
          <h2 className="font-semibold mb-2">Account security</h2>
          <p className="text-sm text-muted-foreground mb-2">We'll email you a secure link to change your password.</p>
          <Button variant="outline" onClick={sendPasswordReset}>Send password reset email</Button>
        </div>
      </div>
    </div>
  );
}