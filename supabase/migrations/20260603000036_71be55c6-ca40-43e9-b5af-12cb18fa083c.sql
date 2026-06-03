
DROP POLICY IF EXISTS ca_insert_self ON public.channel_access;

DROP POLICY IF EXISTS mentions_write ON public.mentions;
CREATE POLICY mentions_write ON public.mentions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.messages m WHERE m.id = mentions.message_id AND m.author_id = auth.uid())
    AND (
      mentions.target <> '@all'
      OR EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.channels c ON c.id = m.channel_id
        JOIN public.spaces s ON s.id = c.space_id
        LEFT JOIN public.space_members sm ON sm.space_id = s.id AND sm.user_id = auth.uid()
        WHERE m.id = mentions.message_id
          AND (
            s.mention_all_policy = 'everyone'
            OR (s.mention_all_policy = 'managers' AND sm.role IN ('manager','owner'))
            OR (s.mention_all_policy = 'owners' AND sm.role = 'owner')
          )
      )
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_message_rate_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_space uuid; v_cfg record; v_count int;
BEGIN
  IF NEW.channel_id IS NULL OR NEW.bot_name IS NOT NULL THEN RETURN NEW; END IF;
  SELECT c.space_id INTO v_space FROM public.channels c WHERE c.id = NEW.channel_id;
  IF v_space IS NULL THEN RETURN NEW; END IF;
  SELECT enabled, max_msgs, window_seconds, mute_seconds INTO v_cfg FROM public.filters_rate WHERE space_id = v_space;
  IF NOT FOUND OR NOT COALESCE(v_cfg.enabled, false) THEN RETURN NEW; END IF;
  SELECT count(*) INTO v_count FROM public.messages m
    JOIN public.channels c ON c.id = m.channel_id
   WHERE c.space_id = v_space AND m.author_id = NEW.author_id
     AND m.created_at > now() - make_interval(secs => COALESCE(v_cfg.window_seconds, 10));
  IF v_count >= COALESCE(v_cfg.max_msgs, 5) THEN
    UPDATE public.space_members SET muted_until = now() + make_interval(secs => COALESCE(v_cfg.mute_seconds, 300))
     WHERE space_id = v_space AND user_id = NEW.author_id;
    RAISE EXCEPTION 'Rate limit exceeded — you have been muted briefly';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_message_rate_limit ON public.messages;
CREATE TRIGGER trg_enforce_message_rate_limit
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_message_rate_limit();

REVOKE EXECUTE ON FUNCTION public.has_space_role(uuid, uuid, space_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_space_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_dm_participant(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_dm_participant_any(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.message_visible(public.messages, uuid) FROM PUBLIC, anon;
