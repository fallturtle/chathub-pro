import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPwd });

function ResetPwd() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery hash on load and emits PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (pwd.length < 8) return toast.error("Password must be 8+ characters");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    nav({ to: "/app" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Set a new password</h1>
        {!ready ? (
          <p className="text-sm text-muted-foreground">Open this page from the password reset email link.</p>
        ) : (
          <>
            <div><Label>New password</Label><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} /></div>
            <Button className="w-full" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
          </>
        )}
      </div>
    </div>
  );
}
