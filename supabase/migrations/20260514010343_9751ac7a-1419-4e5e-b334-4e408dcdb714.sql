
-- 1) Move join_code to a member-scoped table
CREATE TABLE public.space_join_codes (
  space_id uuid PRIMARY KEY REFERENCES public.spaces(id) ON DELETE CASCADE,
  join_code text NOT NULL UNIQUE
);

INSERT INTO public.space_join_codes (space_id, join_code)
SELECT id, join_code FROM public.spaces;

ALTER TABLE public.spaces DROP COLUMN join_code;

ALTER TABLE public.space_join_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY sjc_select ON public.space_join_codes
  FOR SELECT TO authenticated
  USING (public.is_space_member(space_id, auth.uid()));

CREATE POLICY sjc_manage ON public.space_join_codes
  FOR ALL TO authenticated
  USING (public.has_space_role(space_id, auth.uid(), 'manager'))
  WITH CHECK (public.has_space_role(space_id, auth.uid(), 'manager'));

-- Update bootstrap_space to also create a join code row
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
    (new.id, 'general', 'general', 0),
    (new.id, 'announcements', 'announcement', 1),
    (new.id, 'rules', 'rules', 2),
    (new.id, 'links', 'links', 3);
  insert into public.filters_rate (space_id) values (new.id) on conflict do nothing;
  insert into public.space_join_codes (space_id, join_code)
    values (new.id, substr(md5(random()::text), 1, 8))
    on conflict do nothing;
  return new;
end $function$;

DROP TRIGGER IF EXISTS trg_bootstrap_space ON public.spaces;
CREATE TRIGGER trg_bootstrap_space
  AFTER INSERT ON public.spaces
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_space();

REVOKE EXECUTE ON FUNCTION public.bootstrap_space() FROM anon, authenticated, public;

-- 2) Guard message updates: prevent channel relocation + ban/mute editing
CREATE OR REPLACE FUNCTION public.guard_message_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if NEW.channel_id IS DISTINCT FROM OLD.channel_id
     or NEW.dm_thread_id IS DISTINCT FROM OLD.dm_thread_id
     or NEW.author_id IS DISTINCT FROM OLD.author_id then
    raise exception 'Cannot relocate or reassign messages';
  end if;
  if OLD.channel_id is not null then
    if exists (
      select 1 from public.channels c
      join public.space_members sm
        on sm.space_id = c.space_id and sm.user_id = auth.uid()
      where c.id = OLD.channel_id
        and (sm.banned or (sm.muted_until is not null and sm.muted_until > now()))
    ) then
      raise exception 'You are banned or muted in this space';
    end if;
  end if;
  return NEW;
end $function$;

DROP TRIGGER IF EXISTS trg_guard_message_update ON public.messages;
CREATE TRIGGER trg_guard_message_update
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_message_update();

REVOKE EXECUTE ON FUNCTION public.guard_message_update() FROM anon, authenticated, public;
