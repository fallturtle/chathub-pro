
CREATE TABLE IF NOT EXISTS public.user_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip TEXT NOT NULL,
  user_agent TEXT,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ip)
);
GRANT SELECT, INSERT, UPDATE ON public.user_ips TO authenticated;
GRANT ALL ON public.user_ips TO service_role;
ALTER TABLE public.user_ips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert own ip" ON public.user_ips FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own ip" ON public.user_ips FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users read own ip" ON public.user_ips FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all ips" ON public.user_ips FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS emoji TEXT;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS color TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'channel_kind' AND e.enumlabel = 'community') THEN
    ALTER TYPE public.channel_kind ADD VALUE 'community';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  score INT NOT NULL DEFAULT 0,
  pinned BOOLEAN NOT NULL DEFAULT false,
  locked BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read community posts" ON public.community_posts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id AND public.is_space_member(c.space_id, auth.uid()))
);
CREATE POLICY "members create community posts" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (
  author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id AND public.is_space_member(c.space_id, auth.uid()))
);
CREATE POLICY "authors or mods update community posts" ON public.community_posts FOR UPDATE TO authenticated USING (
  author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id AND public.has_space_role(c.space_id, auth.uid(), 'manager'))
);
CREATE POLICY "authors or mods delete community posts" ON public.community_posts FOR DELETE TO authenticated USING (
  author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id AND public.has_space_role(c.space_id, auth.uid(), 'manager'))
);

CREATE TABLE IF NOT EXISTS public.community_post_votes (
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_post_votes TO authenticated;
GRANT ALL ON public.community_post_votes TO service_role;
ALTER TABLE public.community_post_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vote read" ON public.community_post_votes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.community_posts p JOIN public.channels c ON c.id = p.channel_id WHERE p.id = post_id AND public.is_space_member(c.space_id, auth.uid()))
);
CREATE POLICY "vote own" ON public.community_post_votes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.retention_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  message_days INT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.retention_settings (id, message_days) VALUES (1, NULL) ON CONFLICT DO NOTHING;
GRANT SELECT ON public.retention_settings TO authenticated;
GRANT ALL ON public.retention_settings TO service_role;
ALTER TABLE public.retention_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read retention" ON public.retention_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin update retention" ON public.retention_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;
