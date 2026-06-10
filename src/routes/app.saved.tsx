import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bookmark, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/saved")({ component: SavedPage });

function SavedPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bookmarks")
      .select("id, note, created_at, message:messages(id, body, author_id, channel_id, created_at)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("bookmarks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((i) => i.filter((x) => x.id !== id));
  };

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto space-y-4 overflow-y-auto">
        <div className="flex items-center gap-2"><Bookmark className="h-5 w-5 text-primary" /><h1 className="text-2xl font-bold">Saved messages</h1></div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing saved yet. Hover a message and click the bookmark icon.</p>
        ) : items.map((b) => (
          <Card key={b.id} className="p-4">
            <div className="flex justify-between items-start gap-3">
              <div className="text-sm whitespace-pre-wrap flex-1">{b.message?.body ?? "(deleted)"}</div>
              <Button size="icon" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="text-xs text-muted-foreground mt-2">Saved {new Date(b.created_at).toLocaleString()}</div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}