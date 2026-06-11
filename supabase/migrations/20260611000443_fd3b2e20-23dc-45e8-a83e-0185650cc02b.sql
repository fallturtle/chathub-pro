
-- 1) Auto-accept DM for sender on message insert
CREATE OR REPLACE FUNCTION public.auto_accept_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.dm_thread_id IS NOT NULL AND NEW.author_id IS NOT NULL THEN
    UPDATE public.dm_participants
       SET accepted = true
     WHERE thread_id = NEW.dm_thread_id
       AND user_id = NEW.author_id
       AND accepted = false;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS auto_accept_dm_trg ON public.messages;
CREATE TRIGGER auto_accept_dm_trg AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.auto_accept_dm();

-- 2) Site bans (site-wide lockout)
CREATE TABLE IF NOT EXISTS public.site_bans (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT 'Violated community guidelines',
  banned_at timestamptz NOT NULL DEFAULT now(),
  banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT ON public.site_bans TO authenticated;
GRANT ALL ON public.site_bans TO service_role;
ALTER TABLE public.site_bans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "site_bans_select" ON public.site_bans;
CREATE POLICY "site_bans_select" ON public.site_bans FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "site_bans_admin_write" ON public.site_bans;
CREATE POLICY "site_bans_admin_write" ON public.site_bans FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 3) Ban appeals
CREATE TABLE IF NOT EXISTS public.ban_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ban_appeals TO authenticated;
GRANT UPDATE ON public.ban_appeals TO authenticated;
GRANT ALL ON public.ban_appeals TO service_role;
ALTER TABLE public.ban_appeals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "appeals_insert_self" ON public.ban_appeals;
CREATE POLICY "appeals_insert_self" ON public.ban_appeals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "appeals_select" ON public.ban_appeals;
CREATE POLICY "appeals_select" ON public.ban_appeals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "appeals_update_admin" ON public.ban_appeals;
CREATE POLICY "appeals_update_admin" ON public.ban_appeals FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 4) Site settings — immutable site owner
CREATE TABLE IF NOT EXISTS public.site_settings (
  id int PRIMARY KEY CHECK (id = 1),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_read" ON public.site_settings;
CREATE POLICY "settings_read" ON public.site_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "settings_admin_write" ON public.site_settings;
CREATE POLICY "settings_admin_write" ON public.site_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

INSERT INTO public.site_settings (id, owner_user_id)
  SELECT 1, p.id FROM public.profiles p WHERE lower(p.username) = 'micah' LIMIT 1
ON CONFLICT (id) DO UPDATE SET owner_user_id = COALESCE(public.site_settings.owner_user_id, EXCLUDED.owner_user_id);

-- 5) Protect site owner from demotion / role change
CREATE OR REPLACE FUNCTION public.protect_site_owner_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT owner_user_id INTO v_owner FROM public.site_settings WHERE id = 1;
  IF v_owner IS NOT NULL
     AND OLD.user_id = v_owner
     AND OLD.role = 'admin'::app_role
     AND auth.uid() IS DISTINCT FROM v_owner THEN
    RAISE EXCEPTION 'Only the site owner can remove themselves from admin';
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS protect_site_owner_admin_trg ON public.user_roles;
CREATE TRIGGER protect_site_owner_admin_trg BEFORE DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_site_owner_admin();
