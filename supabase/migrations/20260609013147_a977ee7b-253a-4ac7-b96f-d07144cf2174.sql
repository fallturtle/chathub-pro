
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS font_pref text DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS density text DEFAULT 'cozy';

ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS slowmode_seconds int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS automod_preset text NOT NULL DEFAULT 'balanced';

ALTER TABLE public.polls
  ADD COLUMN IF NOT EXISTS anonymous boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, message_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookmarks_own" ON public.bookmarks;
CREATE POLICY "bookmarks_own" ON public.bookmarks FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE,
  dm_thread_id uuid REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  body text NOT NULL,
  send_at timestamptz NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((channel_id IS NOT NULL) <> (dm_thread_id IS NOT NULL))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_messages TO authenticated;
GRANT ALL ON public.scheduled_messages TO service_role;
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sched_own" ON public.scheduled_messages;
CREATE POLICY "sched_own" ON public.scheduled_messages FOR ALL TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reports_insert_members" ON public.reports;
DROP POLICY IF EXISTS "reports_select_managers" ON public.reports;
DROP POLICY IF EXISTS "reports_update_managers" ON public.reports;
CREATE POLICY "reports_insert_members" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND is_space_member(space_id, auth.uid()));
CREATE POLICY "reports_select_managers" ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR has_space_role(space_id, auth.uid(), 'manager'::space_role));
CREATE POLICY "reports_update_managers" ON public.reports FOR UPDATE TO authenticated
  USING (has_space_role(space_id, auth.uid(), 'manager'::space_role));

CREATE TABLE IF NOT EXISTS public.site_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  space_id uuid REFERENCES public.spaces(id) ON DELETE SET NULL,
  escalator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_reports TO authenticated;
GRANT ALL ON public.site_reports TO service_role;
ALTER TABLE public.site_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "site_reports_insert_managers" ON public.site_reports;
DROP POLICY IF EXISTS "site_reports_select_admins" ON public.site_reports;
DROP POLICY IF EXISTS "site_reports_update_admins" ON public.site_reports;
CREATE POLICY "site_reports_insert_managers" ON public.site_reports FOR INSERT TO authenticated
  WITH CHECK (escalator_id = auth.uid() AND (space_id IS NULL OR has_space_role(space_id, auth.uid(), 'manager'::space_role)));
CREATE POLICY "site_reports_select_admins" ON public.site_reports FOR SELECT TO authenticated
  USING (escalator_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "site_reports_update_admins" ON public.site_reports FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  requested_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(space_id, requested_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.join_requests TO authenticated;
GRANT ALL ON public.join_requests TO service_role;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jr_insert_manager" ON public.join_requests;
DROP POLICY IF EXISTS "jr_select" ON public.join_requests;
DROP POLICY IF EXISTS "jr_update_self" ON public.join_requests;
CREATE POLICY "jr_insert_manager" ON public.join_requests FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid() AND has_space_role(space_id, auth.uid(), 'manager'::space_role));
CREATE POLICY "jr_select" ON public.join_requests FOR SELECT TO authenticated
  USING (requested_user_id = auth.uid() OR has_space_role(space_id, auth.uid(), 'manager'::space_role));
CREATE POLICY "jr_update_self" ON public.join_requests FOR UPDATE TO authenticated
  USING (requested_user_id = auth.uid() OR has_space_role(space_id, auth.uid(), 'manager'::space_role));

CREATE TABLE IF NOT EXISTS public.space_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  response text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(space_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.space_commands TO authenticated;
GRANT ALL ON public.space_commands TO service_role;
ALTER TABLE public.space_commands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sc_select_members" ON public.space_commands;
DROP POLICY IF EXISTS "sc_write_managers" ON public.space_commands;
CREATE POLICY "sc_select_members" ON public.space_commands FOR SELECT TO authenticated
  USING (is_space_member(space_id, auth.uid()));
CREATE POLICY "sc_write_managers" ON public.space_commands FOR ALL TO authenticated
  USING (has_space_role(space_id, auth.uid(), 'manager'::space_role))
  WITH CHECK (has_space_role(space_id, auth.uid(), 'manager'::space_role));

CREATE TABLE IF NOT EXISTS public.bot_channels (
  webhook_id uuid NOT NULL REFERENCES public.bot_webhooks(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  PRIMARY KEY (webhook_id, channel_id)
);
GRANT SELECT, INSERT, DELETE ON public.bot_channels TO authenticated;
GRANT ALL ON public.bot_channels TO service_role;
ALTER TABLE public.bot_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bc_select_members" ON public.bot_channels;
DROP POLICY IF EXISTS "bc_write_managers" ON public.bot_channels;
CREATE POLICY "bc_select_members" ON public.bot_channels FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bot_webhooks w WHERE w.id = webhook_id AND is_space_member(w.space_id, auth.uid())));
CREATE POLICY "bc_write_managers" ON public.bot_channels FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bot_webhooks w WHERE w.id = webhook_id AND has_space_role(w.space_id, auth.uid(), 'manager'::space_role)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bot_webhooks w WHERE w.id = webhook_id AND has_space_role(w.space_id, auth.uid(), 'manager'::space_role)));

ALTER TABLE public.bot_webhooks
  ADD COLUMN IF NOT EXISTS posts_everywhere boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.ip_bans (
  ip text PRIMARY KEY,
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.ip_bans TO authenticated;
GRANT ALL ON public.ip_bans TO service_role;
ALTER TABLE public.ip_bans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ip_bans_admin" ON public.ip_bans;
CREATE POLICY "ip_bans_admin" ON public.ip_bans FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.enforce_slowmode()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_slow int; v_last timestamptz;
BEGIN
  IF NEW.channel_id IS NULL OR NEW.bot_name IS NOT NULL THEN RETURN NEW; END IF;
  SELECT slowmode_seconds INTO v_slow FROM public.channels WHERE id = NEW.channel_id;
  IF COALESCE(v_slow, 0) <= 0 THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.channels c JOIN public.space_members sm
              ON sm.space_id = c.space_id AND sm.user_id = NEW.author_id
             WHERE c.id = NEW.channel_id AND sm.role IN ('manager','owner')) THEN
    RETURN NEW;
  END IF;
  SELECT max(created_at) INTO v_last FROM public.messages
    WHERE channel_id = NEW.channel_id AND author_id = NEW.author_id;
  IF v_last IS NOT NULL AND v_last > now() - make_interval(secs => v_slow) THEN
    RAISE EXCEPTION 'Slowmode: wait % seconds between messages', v_slow;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS messages_slowmode ON public.messages;
CREATE TRIGGER messages_slowmode BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_slowmode();

CREATE OR REPLACE FUNCTION public.apply_bot_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; matched boolean; v_space uuid; resp text; uname text;
BEGIN
  IF NEW.channel_id IS NULL OR NEW.bot_name IS NOT NULL OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT c.space_id INTO v_space FROM public.channels c WHERE c.id = NEW.channel_id;
  SELECT COALESCE(display_name, username, 'user') INTO uname FROM public.profiles WHERE id = NEW.author_id;
  FOR r IN
    SELECT br.trigger, br.response, br.match_type, w.name AS bot_name, w.created_by, w.id AS webhook_id, w.posts_everywhere
    FROM public.bot_rules br
    JOIN public.bot_webhooks w ON w.id = br.webhook_id
    WHERE br.enabled AND w.enabled AND w.space_id = v_space
      AND (
        w.posts_everywhere = true
        OR w.channel_id = NEW.channel_id
        OR EXISTS (SELECT 1 FROM public.bot_channels bc WHERE bc.webhook_id = w.id AND bc.channel_id = NEW.channel_id)
      )
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
      resp := r.response;
      resp := replace(resp, '{user}', '@' || uname);
      resp := replace(resp, '{date}', to_char(now(), 'YYYY-MM-DD'));
      resp := replace(resp, '{time}', to_char(now(), 'HH24:MI'));
      INSERT INTO public.messages (channel_id, author_id, body, bot_name)
      VALUES (NEW.channel_id, r.created_by, resp, r.bot_name);
      UPDATE public.bot_webhooks SET last_used_at = now() WHERE id = r.webhook_id;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
