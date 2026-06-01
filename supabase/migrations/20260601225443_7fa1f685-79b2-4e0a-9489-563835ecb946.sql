
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS bot_name text;

CREATE TABLE IF NOT EXISTS public.site_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_questions TO anon;
GRANT SELECT, INSERT, DELETE ON public.site_questions TO authenticated;
GRANT ALL ON public.site_questions TO service_role;
ALTER TABLE public.site_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_q_read_all" ON public.site_questions FOR SELECT USING (true);
CREATE POLICY "site_q_insert_self" ON public.site_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "site_q_delete_self" ON public.site_questions FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE TABLE IF NOT EXISTS public.site_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.site_questions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_answers TO anon;
GRANT SELECT, INSERT, DELETE ON public.site_answers TO authenticated;
GRANT ALL ON public.site_answers TO service_role;
ALTER TABLE public.site_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_a_read_all" ON public.site_answers FOR SELECT USING (true);
CREATE POLICY "site_a_insert_self" ON public.site_answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "site_a_delete_self" ON public.site_answers FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS site_answers_q_idx ON public.site_answers(question_id);
