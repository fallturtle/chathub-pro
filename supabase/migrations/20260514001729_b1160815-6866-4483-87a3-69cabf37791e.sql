-- 1. Restrict invites SELECT to space members / managers
DROP POLICY IF EXISTS inv_select ON public.invites;
CREATE POLICY inv_select ON public.invites
  FOR SELECT TO authenticated
  USING (public.is_space_member(space_id, auth.uid()));

-- 2. Lock down Realtime broadcast/presence (app uses postgres_changes only).
-- Enabling RLS with no policies = deny by default, which is what we want.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- 3. Avatars bucket: allow users to delete their own avatar
CREATE POLICY av_del ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4 & 5. Spaces bucket: restrict INSERT/UPDATE/DELETE to managers of that space.
-- Path convention: "<space_id>/..."
DROP POLICY IF EXISTS sp_ins ON storage.objects;
DROP POLICY IF EXISTS sp_upd ON storage.objects;

CREATE POLICY sp_ins ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'spaces'
    AND public.has_space_role(
      ((storage.foldername(name))[1])::uuid,
      auth.uid(),
      'manager'::public.space_role
    )
  );

CREATE POLICY sp_upd ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'spaces'
    AND public.has_space_role(
      ((storage.foldername(name))[1])::uuid,
      auth.uid(),
      'manager'::public.space_role
    )
  );

CREATE POLICY sp_del ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'spaces'
    AND public.has_space_role(
      ((storage.foldername(name))[1])::uuid,
      auth.uid(),
      'manager'::public.space_role
    )
  );

-- 6. Revoke direct EXECUTE on SECURITY DEFINER helpers from anon/authenticated.
-- They are still invoked by RLS policies (policy execution ignores EXECUTE grants).
REVOKE EXECUTE ON FUNCTION public.has_space_role(uuid, uuid, public.space_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_space_member(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_dm_participant(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.message_visible(public.messages, uuid) FROM anon, authenticated, public;

-- 7. Tighten RLS policies that used WITH CHECK (true).
-- DM threads and participants are created server-side via the admin client (startDm),
-- which bypasses RLS — so we can safely deny direct client inserts.
DROP POLICY IF EXISTS dm_threads_insert ON public.dm_threads;
CREATE POLICY dm_threads_insert ON public.dm_threads
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS dmp_insert ON public.dm_participants;
CREATE POLICY dmp_insert ON public.dm_participants
  FOR INSERT TO authenticated
  WITH CHECK (false);
