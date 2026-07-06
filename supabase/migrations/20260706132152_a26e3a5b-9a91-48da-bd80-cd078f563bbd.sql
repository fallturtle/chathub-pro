
CREATE OR REPLACE FUNCTION public.auto_accept_dm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.dm_thread_id IS NOT NULL THEN
    UPDATE public.dm_participants
       SET accepted = true
     WHERE thread_id = NEW.dm_thread_id
       AND accepted = false;
  END IF;
  RETURN NEW;
END $function$;
