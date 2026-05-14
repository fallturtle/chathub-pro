DROP POLICY IF EXISTS members_insert ON public.space_members;
CREATE POLICY members_insert ON public.space_members
FOR INSERT TO authenticated
WITH CHECK (
  (user_id = auth.uid() AND role = 'member'::space_role)
  OR has_space_role(space_id, auth.uid(), 'manager'::space_role)
);

DROP POLICY IF EXISTS members_update ON public.space_members;
CREATE POLICY members_update ON public.space_members
FOR UPDATE TO authenticated
USING (has_space_role(space_id, auth.uid(), 'manager'::space_role))
WITH CHECK (has_space_role(space_id, auth.uid(), 'manager'::space_role));