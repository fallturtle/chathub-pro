import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmAction } from "@/components/confirm-action";
import { ChevronLeft, MessageCircle, Plus, Check, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/app/s/$spaceId/forum")({
  component: ForumPage,
});

function ForumPage() {
  const { spaceId } = Route.useParams();
  const { user } = useAuth();
  const [role, setRole] = useState<string>("member");
  const [list, setList] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [title, setTitle] = useState(""); const [body, setBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [answer, setAnswer] = useState("");

  const loadList = async () => {
    const { data } = await supabase.from("forum_questions").select("*").eq("space_id", spaceId).order("created_at", { ascending: false });
    setList(data ?? []);
  };
  const loadAnswers = async (qid: string) => {
    const { data } = await supabase.from("forum_answers").select("*").eq("question_id", qid).order("created_at");
    setAnswers(data ?? []);
  };

  useEffect(() => {
    if (!user) return;
    loadList();
    supabase.from("space_members").select("role").eq("space_id", spaceId).eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setRole((data as any)?.role ?? "member"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, user]);

  useEffect(() => { if (active) loadAnswers(active.id); }, [active]);

  const canManage = role === "owner" || role === "manager";

  const submitQuestion = async () => {
    if (!title.trim()) return;
    const { error } = await supabase.from("forum_questions").insert({ space_id: spaceId, title: title.trim().slice(0, 200), body: body.trim().slice(0, 4000) });
    if (error) return toast.error(error.message);
    setTitle(""); setBody(""); setCreating(false);
    toast.success("Question posted anonymously");
    loadList();
  };

  const submitAnswer = async () => {
    if (!answer.trim() || !active) return;
    const { error } = await supabase.from("forum_answers").insert({ question_id: active.id, body: answer.trim().slice(0, 4000) });
    if (error) return toast.error(error.message);
    setAnswer("");
    loadAnswers(active.id);
  };

  if (active) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <button onClick={() => setActive(null)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ChevronLeft className="h-4 w-4" /> Back to forum</button>
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold">{active.title}</h1>
            {active.answered && <span className="text-xs px-2 py-0.5 rounded bg-green-500/15 text-green-500">Answered</span>}
          </div>
          {active.body && <p className="text-sm mt-2 whitespace-pre-wrap text-muted-foreground">{active.body}</p>}
          <p className="text-xs text-muted-foreground mt-3">Anonymous · {formatDistanceToNow(new Date(active.created_at))} ago</p>
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold text-sm text-muted-foreground">{answers.length} answer{answers.length === 1 ? "" : "s"}</h2>
          {answers.map((a) => (
            <div key={a.id} className={`border rounded-lg p-3 bg-card ${a.accepted ? "border-green-500/50" : ""}`}>
              <p className="text-sm whitespace-pre-wrap">{a.body}</p>
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>Anonymous · {formatDistanceToNow(new Date(a.created_at))} ago{a.accepted && " · ✓ Accepted"}</span>
                {canManage && (
                  <div className="flex gap-1">
                    {!a.accepted && (
                      <Button size="sm" variant="ghost" onClick={async () => {
                        await supabase.from("forum_answers").update({ accepted: true }).eq("id", a.id);
                        await supabase.from("forum_questions").update({ answered: true }).eq("id", active.id);
                        loadAnswers(active.id); loadList();
                      }}><Check className="h-3 w-3 mr-1" /> Accept</Button>
                    )}
                    <ConfirmAction title="Delete this answer?" description="It will be removed permanently." onConfirm={async () => {
                      await supabase.from("forum_answers").delete().eq("id", a.id); loadAnswers(active.id);
                    }}>
                      <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </ConfirmAction>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border rounded-lg p-3 bg-card space-y-2">
          <Label htmlFor="ans" className="text-xs text-muted-foreground">Reply anonymously</Label>
          <Textarea id="ans" rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer…" />
          <Button size="sm" onClick={submitAnswer} disabled={!answer.trim()}>Post answer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MessageCircle className="h-6 w-6" /> Forum</h1>
          <p className="text-sm text-muted-foreground">Ask questions anonymously. No usernames are stored.</p>
        </div>
        <Button onClick={() => setCreating((v) => !v)}><Plus className="h-4 w-4 mr-1" /> Ask</Button>
      </div>

      {creating && (
        <div className="border rounded-lg p-4 bg-card space-y-2">
          <Input placeholder="Question title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          <Textarea rows={4} placeholder="Add details (optional)" value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} />
          <div className="flex gap-2"><Button onClick={submitQuestion} disabled={!title.trim()}>Post anonymously</Button><Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button></div>
        </div>
      )}

      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No questions yet — be the first to ask.</p>}
        {list.map((q) => (
          <button key={q.id} onClick={() => setActive(q)} className="w-full text-left border rounded-lg p-3 bg-card hover:bg-accent/40 transition">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{q.title}</h3>
              {q.answered && <span className="text-xs px-2 py-0.5 rounded bg-green-500/15 text-green-500 shrink-0">Answered</span>}
            </div>
            {q.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{q.body}</p>}
            <p className="text-xs text-muted-foreground mt-1">Anonymous · {formatDistanceToNow(new Date(q.created_at))} ago</p>
            {canManage && (
              <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                <ConfirmAction title="Delete this question?" description="The question and all its answers will be removed." confirmLabel="Delete" onConfirm={async () => {
                  await supabase.from("forum_answers").delete().eq("question_id", q.id);
                  await supabase.from("forum_questions").delete().eq("id", q.id);
                  loadList();
                }}>
                  <Button size="sm" variant="ghost" className="text-destructive h-7 px-2"><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
                </ConfirmAction>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function Label({ children, ...p }: any) { return <label {...p}>{children}</label>; }