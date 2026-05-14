
-- 1) Block managers from changing owner_id; only current owner can.
CREATE OR REPLACE FUNCTION public.guard_spaces_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    IF OLD.owner_id <> auth.uid() THEN
      RAISE EXCEPTION 'Only the current owner can transfer ownership';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_spaces_update_trg ON public.spaces;
CREATE TRIGGER guard_spaces_update_trg
BEFORE UPDATE ON public.spaces
FOR EACH ROW EXECUTE FUNCTION public.guard_spaces_update();

-- 2) Reactions INSERT must verify message is visible to the user.
DROP POLICY IF EXISTS react_write ON public.reactions;
CREATE POLICY react_write ON public.reactions
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = reactions.message_id
      AND public.message_visible(m.*, auth.uid())
  )
);
