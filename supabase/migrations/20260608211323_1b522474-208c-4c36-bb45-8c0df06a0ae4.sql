
-- 1) bot_rules
CREATE TABLE IF NOT EXISTS public.bot_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.bot_webhooks(id) ON DELETE CASCADE,
  trigger text NOT NULL,
  response text NOT NULL,
  match_type text NOT NULL DEFAULT 'contains' CHECK (match_type IN ('contains','starts','exact','regex')),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_rules TO authenticated;
GRANT ALL ON public.bot_rules TO service_role;
ALTER TABLE public.bot_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rules_select_members" ON public.bot_rules FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.bot_webhooks w WHERE w.id = bot_rules.webhook_id AND public.is_space_member(w.space_id, auth.uid()))
);
CREATE POLICY "rules_write_managers" ON public.bot_rules FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.bot_webhooks w WHERE w.id = bot_rules.webhook_id AND public.has_space_role(w.space_id, auth.uid(), 'manager'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.bot_webhooks w WHERE w.id = bot_rules.webhook_id AND public.has_space_role(w.space_id, auth.uid(), 'manager'))
);

-- 2) trigger that auto-replies
CREATE OR REPLACE FUNCTION public.apply_bot_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; matched boolean;
BEGIN
  IF NEW.channel_id IS NULL OR NEW.bot_name IS NOT NULL OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  FOR r IN
    SELECT br.trigger, br.response, br.match_type, w.name AS bot_name, w.created_by, w.id AS webhook_id
    FROM public.bot_rules br
    JOIN public.bot_webhooks w ON w.id = br.webhook_id
    WHERE br.enabled AND w.enabled AND w.channel_id = NEW.channel_id
    LIMIT 50
  LOOP
    matched := false;
    BEGIN
      IF r.match_type = 'contains' THEN matched := position(lower(r.trigger) in lower(NEW.body)) > 0;
      ELSIF r.match_type = 'starts' THEN matched := lower(NEW.body) LIKE lower(r.trigger) || '%';
      ELSIF r.match_type = 'exact' THEN matched := lower(btrim(NEW.body)) = lower(btrim(r.trigger));
      ELSIF r.match_type = 'regex' THEN matched := NEW.body ~* r.trigger;
      END IF;
    EXCEPTION WHEN others THEN matched := false;
    END;
    IF matched THEN
      INSERT INTO public.messages (channel_id, author_id, body, bot_name)
      VALUES (NEW.channel_id, r.created_by, replace(r.response, '{user}', '@user'), r.bot_name);
      UPDATE public.bot_webhooks SET last_used_at = now() WHERE id = r.webhook_id;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_apply_bot_rules ON public.messages;
CREATE TRIGGER trg_apply_bot_rules AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.apply_bot_rules();

-- 3) shrink default blocklist for NEW spaces — keep most severe only
CREATE OR REPLACE FUNCTION public.bootstrap_space()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    'nigger','nigga','niggas','niggers','niggah','niggaz','n1gger','n1gga','ni99er','ni99a',
    'faggot','kike','chink','chinky','spic','gook','wetback','tranny','retard',
    'coon','beaner','cunt'
  ]) as word
  on conflict do nothing;
  return new;
end $$;
