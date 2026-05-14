-- Lock down Realtime broadcast/presence channels (deny by default).
-- This app only uses postgres_changes, which authorizes via the underlying
-- table's RLS. There is no legitimate broadcast/presence subscription, so
-- deny all access to realtime.messages for client roles.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rt_deny_all_select" ON realtime.messages;
DROP POLICY IF EXISTS "rt_deny_all_insert" ON realtime.messages;

CREATE POLICY "rt_deny_all_select" ON realtime.messages
  FOR SELECT TO authenticated, anon
  USING (false);

CREATE POLICY "rt_deny_all_insert" ON realtime.messages
  FOR INSERT TO authenticated, anon
  WITH CHECK (false);

-- Defense-in-depth: prevent role escalation via space_members UPDATE RLS.
-- The guard_space_member_update trigger already blocks this, but tighten the
-- RLS WITH CHECK so a manager cannot set role='owner' unless they are owner.
DROP POLICY IF EXISTS "members_update" ON public.space_members;

CREATE POLICY "members_update" ON public.space_members
  FOR UPDATE TO authenticated
  USING (has_space_role(space_id, auth.uid(), 'manager'::space_role))
  WITH CHECK (
    has_space_role(space_id, auth.uid(), 'manager'::space_role)
    AND (
      role <> 'owner'::space_role
      OR has_space_role(space_id, auth.uid(), 'owner'::space_role)
    )
  );