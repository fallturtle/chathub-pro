-- Keep bot configuration visible to managers, but move token hashes into a backend-only table.
CREATE TABLE IF NOT EXISTS public.bot_webhook_tokens (
  webhook_id uuid PRIMARY KEY,
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_webhook_tokens ENABLE ROW LEVEL SECURITY;

INSERT INTO public.bot_webhook_tokens (webhook_id, token_hash)
SELECT id, token_hash
FROM public.bot_webhooks
WHERE token_hash IS NOT NULL
ON CONFLICT (webhook_id) DO NOTHING;

ALTER TABLE public.bot_webhooks
DROP COLUMN IF EXISTS token_hash;

CREATE INDEX IF NOT EXISTS bot_webhook_tokens_hash_idx ON public.bot_webhook_tokens(token_hash);