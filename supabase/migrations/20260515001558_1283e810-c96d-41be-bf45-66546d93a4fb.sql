-- 1. Drop duplicate trigger
DROP TRIGGER IF EXISTS spaces_after_insert ON public.spaces;

-- 2. Allow owners to always SELECT their owned spaces (fixes private-space create RETURNING)
DROP POLICY IF EXISTS spaces_select ON public.spaces;
CREATE POLICY spaces_select ON public.spaces
FOR SELECT TO authenticated
USING (
  visibility = 'public'::space_visibility
  OR owner_id = auth.uid()
  OR is_space_member(id, auth.uid())
);

-- 3. Relax role-change guard: managers may promote member<->manager
CREATE OR REPLACE FUNCTION public.guard_space_member_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Only owners can create or remove owner status
    IF (NEW.role = 'owner'::space_role OR OLD.role = 'owner'::space_role) THEN
      IF NOT has_space_role(NEW.space_id, auth.uid(), 'owner'::space_role) THEN
        RAISE EXCEPTION 'Only owners can grant or revoke owner role';
      END IF;
    ELSE
      -- Manager <-> member transitions allowed for managers and owners
      IF NOT has_space_role(NEW.space_id, auth.uid(), 'manager'::space_role) THEN
        RAISE EXCEPTION 'Only managers or owners can change roles';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Mirror those rules in the members_update RLS WITH CHECK
DROP POLICY IF EXISTS members_update ON public.space_members;
CREATE POLICY members_update ON public.space_members
FOR UPDATE TO authenticated
USING (has_space_role(space_id, auth.uid(), 'manager'::space_role))
WITH CHECK (
  has_space_role(space_id, auth.uid(), 'manager'::space_role)
  AND (
    role <> 'owner'::space_role
    OR has_space_role(space_id, auth.uid(), 'owner'::space_role)
  )
);