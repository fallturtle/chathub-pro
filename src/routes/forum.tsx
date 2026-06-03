import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/forum")({
  head: () => ({
    meta: [
      { title: "Atrium Forum — Community Q&A" },
      { name: "description", content: "Ask questions and share answers with the Atrium community." },
    ],
  }),
  component: SiteForum,
});

function SiteForum() {
  const { user } = useAuth();
  const [qs, setQs] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any[]>>({});
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [replyBody, setReplyBody] = useState<Record<string, string>>({});

  const load = async () => {
    const { data: q } = await supabase.from("site_questions").select("*").order("created_at", { ascending: false }).limit(100);
    setQs(q ?? []);
    const ids = (q ?? []).map((x: any) => x.id);
    if (ids.length) {
      const { data: a } = await supabase.from("site_answers").select("*").in("question_id", ids).order("created_at");
      const grouped: Record<string, any[]> = {};
      (a ?? []).forEach((row: any) => { (grouped[row.question_id] ||= []).push(row); });
      setAnswers(grouped);
      const authorIds = Array.from(new Set([...(q ?? []).map((x: any) => x.author_id), ...(a ?? []).map((x: any) => x.author_id)]));
      if (authorIds.length) {
        const { data: p } = await supabase.from("profiles").select("id,username,display_name,avatar_color").in("id", authorIds);
        const map: Record<string, any> = {};
        (p ?? []).forEach((pr: any) => { map[pr.id] = pr; });
        setProfiles(map);
      }
    }
  };
  useEffect(() => { load(); }, []);

  const ask = async () => {
    if (!user) return toast.error("Sign in to post");
    if (title.trim().length < 3) return toast.error("Title too short");
    if (!body.trim()) return toast.error("Body required");
    const { error } = await supabase.from("site_questions").insert({ author_id: user.id, title: title.trim(), body: body.trim() });
    if (error) return toast.error(error.message);
    setTitle(""); setBody(""); load();
  };

  const answer = async (qid: string) => {
    if (!user) return toast.error("Sign in to answer");
    const text = (replyBody[qid] ?? "").trim();
    if (!text) return;
    const { error } = await supabase.from("site_answers").insert({ question_id: qid, author_id: user.id, body: text });
    if (error) return toast.error(error.message);
    setReplyBody((r) => ({ ...r, [qid]: "" }));
    load();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <Link to="/" className="flex items-center gap-2 font-bold"><ArrowLeft className="h-4 w-4" /> Atrium</Link>
        <div className="flex gap-2">
          {user ? <Link to="/app"><Button size="sm">Open app</Button></Link> : (
            <>
              <Link to="/login"><Button size="sm" variant="ghost">Log in</Button></Link>
              <Link to="/signup"><Button size="sm">Sign up</Button></Link>
            </>
          )}
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold flex items-center gap-2"><MessageCircle className="h-7 w-7 text-primary" /> Community forum</h1>
        <p className="text-muted-foreground mt-2">Ask anything about Atrium — features, setup, tips. Anyone can read; sign in to post.</p>

        {user && (
          <div className="mt-6 border rounded-lg p-4 bg-card space-y-2">
            <h2 className="font-semibold">Ask a question</h2>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's your question?" maxLength={200} />
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add details…" maxLength={4000} rows={3} />
            <Button onClick={ask}>Post question</Button>
          </div>
        )}

        <div className="mt-8 space-y-4">
          {qs.length === 0 && <p className="text-muted-foreground text-sm">No questions yet. Be the first!</p>}
          {qs.map((q) => {
            const ap = profiles[q.author_id];
            const ans = answers[q.id] ?? [];
            return (
              <div key={q.id} className="border rounded-lg p-4 bg-card">
                <h3 className="font-semibold">{q.title}</h3>
                <p className="text-sm mt-1 whitespace-pre-wrap">{q.body}</p>
                <p className="text-xs text-muted-foreground mt-2">— {ap?.display_name || ap?.username || "someone"} · {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}</p>
                <div className="mt-3 space-y-2 pl-3 border-l-2 border-border">
                  {ans.map((a) => {
                    const p = profiles[a.author_id];
                    return (
                      <div key={a.id} className="text-sm">
                        <span className="font-medium">{p?.display_name || p?.username || "user"}: </span>
                        <span className="whitespace-pre-wrap">{a.body}</span>
                      </div>
                    );
                  })}
                </div>
                {user && (
                  <div className="mt-3 flex gap-2">
                    <Input value={replyBody[q.id] ?? ""} onChange={(e) => setReplyBody((r) => ({ ...r, [q.id]: e.target.value }))} placeholder="Write an answer…" />
                    <Button size="sm" onClick={() => answer(q.id)}>Reply</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}