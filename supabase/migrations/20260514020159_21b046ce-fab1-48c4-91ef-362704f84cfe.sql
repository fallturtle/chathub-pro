
-- 1. Drop unused 'prefs' column from profiles to eliminate exposure of private settings via the public read policy.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS prefs;

-- 2. Lock down SECURITY DEFINER functions: revoke from public/anon. Keep EXECUTE for the roles that need them.
-- Helper functions invoked from RLS policies — only authenticated needs EXECUTE.
REVOKE ALL ON FUNCTION public.is_dm_participant(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_space_role(uuid, uuid, public.space_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_space_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.message_visible(public.messages, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_dm_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_space_role(uuid, uuid, public.space_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_space_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.message_visible(public.messages, uuid) TO authenticated;

-- Trigger-only functions — revoke from all client roles. Triggers run as the table owner regardless of grants.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bootstrap_space() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_spaces_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_message_update() FROM PUBLIC, anon, authenticated;
