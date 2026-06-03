
-- 1. Revoke EXECUTE on SECURITY DEFINER helper functions from anon/public
REVOKE EXECUTE ON FUNCTION public.is_space_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_space_role(uuid, uuid, space_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_dm_participant(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_dm_participant_any(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.message_visible(public.messages, uuid) FROM PUBLIC, anon;

-- 2. Custom emojis per space
CREATE TABLE IF NOT EXISTS public.space_emojis (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id uuid NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (space_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.space_emojis TO authenticated;
GRANT ALL ON public.space_emojis TO service_role;

ALTER TABLE public.space_emojis ENABLE ROW LEVEL SECURITY;

CREATE POLICY se_select ON public.space_emojis FOR SELECT TO authenticated
  USING (public.is_space_member(space_id, auth.uid()) OR EXISTS (
    SELECT 1 FROM public.spaces s WHERE s.id = space_id AND s.visibility = 'public'
  ));
CREATE POLICY se_write ON public.space_emojis FOR ALL TO authenticated
  USING (public.has_space_role(space_id, auth.uid(), 'manager'::space_role))
  WITH CHECK (public.has_space_role(space_id, auth.uid(), 'manager'::space_role) AND created_by = auth.uid());

-- 3. Public forum read for public spaces (non-members can read)
DROP POLICY IF EXISTS fq_select ON public.forum_questions;
CREATE POLICY fq_select ON public.forum_questions FOR SELECT TO authenticated
  USING (
    public.is_space_member(space_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.spaces s WHERE s.id = space_id AND s.visibility = 'public')
  );

DROP POLICY IF EXISTS fa_select ON public.forum_answers;
CREATE POLICY fa_select ON public.forum_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forum_questions q
      WHERE q.id = forum_answers.question_id
        AND (
          public.is_space_member(q.space_id, auth.uid())
          OR EXISTS (SELECT 1 FROM public.spaces s WHERE s.id = q.space_id AND s.visibility = 'public')
        )
    )
  );
