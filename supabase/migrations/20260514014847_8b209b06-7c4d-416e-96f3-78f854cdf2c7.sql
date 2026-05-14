
-- 1) Storage UPDATE policy on attachments bucket (owner-folder scoped)
DROP POLICY IF EXISTS "attachments_update_own" ON storage.objects;
CREATE POLICY "attachments_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2) Tighten poll_votes INSERT to require message visibility
DROP POLICY IF EXISTS pvotes_write ON public.poll_votes;
CREATE POLICY pvotes_write
ON public.poll_votes
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.polls p
    JOIN public.messages m ON m.id = p.message_id
    WHERE p.id = poll_votes.poll_id
      AND public.message_visible(m.*, auth.uid())
  )
);

-- 3) Inline ban/mute check on messages UPDATE so a missing trigger
--    cannot re-enable banned/muted users to edit messages.
DROP POLICY IF EXISTS messages_update_author ON public.messages;
CREATE POLICY messages_update_author
ON public.messages
FOR UPDATE
TO authenticated
USING (
  author_id = auth.uid()
  AND (
    channel_id IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.channels c
      JOIN public.space_members sm
        ON sm.space_id = c.space_id AND sm.user_id = auth.uid()
      WHERE c.id = messages.channel_id
        AND (sm.banned OR (sm.muted_until IS NOT NULL AND sm.muted_until > now()))
    )
  )
)
WITH CHECK (
  author_id = auth.uid()
  AND (
    channel_id IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.channels c
      JOIN public.space_members sm
        ON sm.space_id = c.space_id AND sm.user_id = auth.uid()
      WHERE c.id = messages.channel_id
        AND (sm.banned OR (sm.muted_until IS NOT NULL AND sm.muted_until > now()))
    )
  )
);
