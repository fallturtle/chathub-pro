CREATE OR REPLACE FUNCTION public.message_visible(_msg messages, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _msg.channel_id IS NOT NULL THEN EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = _msg.channel_id
        AND public.is_space_member(c.space_id, _user)
        AND (
          c.type <> 'locked'
          OR EXISTS (
            SELECT 1 FROM public.channel_access ca
            WHERE ca.channel_id = c.id AND ca.user_id = _user
          )
        )
    )
    WHEN _msg.dm_thread_id IS NOT NULL THEN public.is_dm_participant(_msg.dm_thread_id, _user)
    ELSE false
  END;
$function$;

DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (
    (
      channel_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.channels c
        WHERE c.id = messages.channel_id
          AND public.is_space_member(c.space_id, auth.uid())
          AND (c.type <> 'announcement'::channel_kind OR public.has_space_role(c.space_id, auth.uid(), 'manager'::space_role))
          AND (
            c.type <> 'locked'::channel_kind
            OR EXISTS (
              SELECT 1 FROM public.channel_access ca
              WHERE ca.channel_id = c.id AND ca.user_id = auth.uid()
            )
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.space_members sm
            WHERE sm.space_id = c.space_id
              AND sm.user_id = auth.uid()
              AND (sm.banned OR (sm.muted_until IS NOT NULL AND sm.muted_until > now()))
          )
      )
    )
    OR (dm_thread_id IS NOT NULL AND public.is_dm_participant(dm_thread_id, auth.uid()))
  )
);