
-- 1. Move password_hash to a separate, restricted table
CREATE TABLE IF NOT EXISTS public.channel_passwords (
  channel_id uuid PRIMARY KEY,
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.channel_passwords (channel_id, password_hash)
SELECT id, password_hash FROM public.channels WHERE password_hash IS NOT NULL
ON CONFLICT (channel_id) DO NOTHING;

ALTER TABLE public.channels DROP COLUMN IF EXISTS password_hash;

ALTER TABLE public.channel_passwords ENABLE ROW LEVEL SECURITY;
-- No policies: only service-role server functions may read/write. Deny-by-default for clients.

-- 2. Re-attach the guard trigger on messages (was missing in current schema)
DROP TRIGGER IF EXISTS guard_message_update_trg ON public.messages;
CREATE TRIGGER guard_message_update_trg
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_message_update();
