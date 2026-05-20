-- Allow users to revoke their own locked-channel access so leaving a locked channel truly re-locks it.
DROP POLICY IF EXISTS ca_delete_self ON public.channel_access;
CREATE POLICY ca_delete_self
ON public.channel_access
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Only treat a DM as message-visible after the current user has accepted that DM thread.
CREATE OR REPLACE FUNCTION public.is_dm_participant(_thread uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.dm_participants
    WHERE thread_id = _thread
      AND user_id = _user
      AND accepted = true
  );
$function$;

-- Public helper for requested DM inbox entries; this intentionally includes unaccepted participation.
CREATE OR REPLACE FUNCTION public.is_dm_participant_any(_thread uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.dm_participants
    WHERE thread_id = _thread
      AND user_id = _user
  );
$function$;

DROP POLICY IF EXISTS dmp_select ON public.dm_participants;
CREATE POLICY dmp_select
ON public.dm_participants
FOR SELECT
TO authenticated
USING (public.is_dm_participant_any(thread_id, auth.uid()));

DROP POLICY IF EXISTS dm_threads_select ON public.dm_threads;
CREATE POLICY dm_threads_select
ON public.dm_threads
FOR SELECT
TO authenticated
USING (public.is_dm_participant_any(id, auth.uid()));

-- Anonymous forums. No author/user columns are stored by design.
CREATE TABLE IF NOT EXISTS public.forum_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  answered boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.forum_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted boolean NOT NULL DEFAULT false
);

ALTER TABLE public.forum_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_answers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS forum_questions_space_created_idx ON public.forum_questions(space_id, created_at DESC);
CREATE INDEX IF NOT EXISTS forum_answers_question_created_idx ON public.forum_answers(question_id, created_at ASC);

DROP POLICY IF EXISTS fq_select ON public.forum_questions;
CREATE POLICY fq_select
ON public.forum_questions
FOR SELECT
TO authenticated
USING (public.is_space_member(space_id, auth.uid()));

DROP POLICY IF EXISTS fq_insert ON public.forum_questions;
CREATE POLICY fq_insert
ON public.forum_questions
FOR INSERT
TO authenticated
WITH CHECK (public.is_space_member(space_id, auth.uid()));

DROP POLICY IF EXISTS fq_update_manage ON public.forum_questions;
CREATE POLICY fq_update_manage
ON public.forum_questions
FOR UPDATE
TO authenticated
USING (public.has_space_role(space_id, auth.uid(), 'manager'::space_role))
WITH CHECK (public.has_space_role(space_id, auth.uid(), 'manager'::space_role));

DROP POLICY IF EXISTS fq_delete_manage ON public.forum_questions;
CREATE POLICY fq_delete_manage
ON public.forum_questions
FOR DELETE
TO authenticated
USING (public.has_space_role(space_id, auth.uid(), 'manager'::space_role));

DROP POLICY IF EXISTS fa_select ON public.forum_answers;
CREATE POLICY fa_select
ON public.forum_answers
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.forum_questions q
  WHERE q.id = forum_answers.question_id
    AND public.is_space_member(q.space_id, auth.uid())
));

DROP POLICY IF EXISTS fa_insert ON public.forum_answers;
CREATE POLICY fa_insert
ON public.forum_answers
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.forum_questions q
  WHERE q.id = forum_answers.question_id
    AND public.is_space_member(q.space_id, auth.uid())
));

DROP POLICY IF EXISTS fa_update_manage ON public.forum_answers;
CREATE POLICY fa_update_manage
ON public.forum_answers
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.forum_questions q
  WHERE q.id = forum_answers.question_id
    AND public.has_space_role(q.space_id, auth.uid(), 'manager'::space_role)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.forum_questions q
  WHERE q.id = forum_answers.question_id
    AND public.has_space_role(q.space_id, auth.uid(), 'manager'::space_role)
));

DROP POLICY IF EXISTS fa_delete_manage ON public.forum_answers;
CREATE POLICY fa_delete_manage
ON public.forum_answers
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.forum_questions q
  WHERE q.id = forum_answers.question_id
    AND public.has_space_role(q.space_id, auth.uid(), 'manager'::space_role)
));

-- Bot webhook configurations for each space. Tokens are stored server-side and never need to be shown again after creation.
CREATE TABLE IF NOT EXISTS public.bot_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL,
  channel_id uuid,
  name text NOT NULL,
  avatar_url text,
  token_hash text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

ALTER TABLE public.bot_webhooks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS bot_webhooks_space_idx ON public.bot_webhooks(space_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bot_webhooks_token_hash_idx ON public.bot_webhooks(token_hash);

DROP POLICY IF EXISTS bw_select ON public.bot_webhooks;
CREATE POLICY bw_select
ON public.bot_webhooks
FOR SELECT
TO authenticated
USING (public.has_space_role(space_id, auth.uid(), 'manager'::space_role));

DROP POLICY IF EXISTS bw_insert ON public.bot_webhooks;
CREATE POLICY bw_insert
ON public.bot_webhooks
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid() AND public.has_space_role(space_id, auth.uid(), 'manager'::space_role));

DROP POLICY IF EXISTS bw_update ON public.bot_webhooks;
CREATE POLICY bw_update
ON public.bot_webhooks
FOR UPDATE
TO authenticated
USING (public.has_space_role(space_id, auth.uid(), 'manager'::space_role))
WITH CHECK (public.has_space_role(space_id, auth.uid(), 'manager'::space_role));

DROP POLICY IF EXISTS bw_delete ON public.bot_webhooks;
CREATE POLICY bw_delete
ON public.bot_webhooks
FOR DELETE
TO authenticated
USING (public.has_space_role(space_id, auth.uid(), 'manager'::space_role));

-- Improve default filters for newly created spaces.
CREATE OR REPLACE FUNCTION public.bootstrap_space()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.space_members (space_id, user_id, role)
    values (new.id, new.owner_id, 'owner') on conflict do nothing;
  insert into public.channels (space_id, name, type, position) values
    (new.id, 'general', 'general', 0)
  on conflict do nothing;
  insert into public.filters_rate (space_id) values (new.id) on conflict do nothing;
  insert into public.space_join_codes (space_id, join_code)
    values (new.id, substr(md5(random()::text), 1, 8))
    on conflict do nothing;
  insert into public.filters_blocked (space_id, word)
  select new.id, word
  from unnest(array[
    'fuck','fucker','fucking','motherfucker','shit','bullshit','bitch','bitches','asshole','dick','cock','pussy','cunt','slut','whore','bastard','damn','crap','nigger','nigga','niggah','niggas','niggaz','n1gger','n1gga','ni99er','ni99a','fag','faggot','retard','kike','spic','chink','gook','wetback','tranny'
  ]) as word
  on conflict do nothing;
  return new;
end $function$;

-- Helpful uniqueness for default filter upserts.
CREATE UNIQUE INDEX IF NOT EXISTS filters_blocked_space_word_key ON public.filters_blocked(space_id, lower(word));