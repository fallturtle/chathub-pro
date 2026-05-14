
-- 1. Restrict members_insert: managers cannot insert role='owner'
DROP POLICY IF EXISTS members_insert ON public.space_members;
CREATE POLICY members_insert ON public.space_members
  FOR INSERT TO authenticated
  WITH CHECK (
    ((user_id = auth.uid()) AND (role = 'member'::space_role))
    OR (
      has_space_role(space_id, auth.uid(), 'manager'::space_role)
      AND role <> 'owner'::space_role
    )
    OR has_space_role(space_id, auth.uid(), 'owner'::space_role)
  );

-- 2. Prevent privilege escalation via UPDATE (managers can't set role='owner', and only owners can change owner-rows)
CREATE OR REPLACE FUNCTION public.guard_space_member_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT has_space_role(NEW.space_id, auth.uid(), 'owner'::space_role) THEN
      RAISE EXCEPTION 'Only owners can change member roles';
    END IF;
  END IF;
  IF OLD.role = 'owner'::space_role
     AND NOT has_space_role(OLD.space_id, auth.uid(), 'owner'::space_role) THEN
    RAISE EXCEPTION 'Only owners can modify owner rows';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.guard_space_member_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_space_member_update_trg ON public.space_members;
CREATE TRIGGER guard_space_member_update_trg
  BEFORE UPDATE ON public.space_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_space_member_update();

-- 3. Drop theme_pref column (move to client localStorage)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS theme_pref;

-- 4. Invalidate weak SHA-256 channel password hashes so they get re-set with bcrypt
DELETE FROM public.channel_passwords;
