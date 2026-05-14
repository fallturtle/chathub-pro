import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { loginWithIdentifier } from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in — Atrium" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const login = useServerFn(loginWithIdentifier);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const session = await login({ data: { identifier: identifier.trim(), password } });
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (error) throw error;
    } catch (err: any) {
      setLoading(false);
      return toast.error(err?.message ?? "Invalid login");
    }
    setLoading(false);
    toast.success("Welcome back");
    nav({ to: "/app" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6">
        <div className="text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-primary to-pink-500 text-white font-bold">A</div>
          <h1 className="mt-3 text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Log in to your Atrium account</p>
        </div>
        <div>
          <Label htmlFor="id">Email or username</Label>
          <Input id="id" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoComplete="username" placeholder="you@example.com or your_username" />
        </div>
        <div>
          <Label htmlFor="pw">Password</Label>
          <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          No account? <Link to="/signup" className="text-primary underline">Sign up</Link>
        </div>
      </form>
    </div>
  );
}