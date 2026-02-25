
-- Fix 1: Poll vote validation - prevent duplicate/invalid votes
-- Unique constraint to prevent voting for same option twice
CREATE UNIQUE INDEX IF NOT EXISTS unique_option_vote ON public.poll_votes (poll_id, user_id, option_id);

-- Trigger to enforce single-choice poll constraint
CREATE OR REPLACE FUNCTION public.validate_poll_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _poll record;
  _existing_votes integer;
BEGIN
  SELECT multiple_choice, status INTO _poll FROM public.polls WHERE id = NEW.poll_id;

  IF _poll.status != 'open' THEN
    RAISE EXCEPTION 'Poll is closed';
  END IF;

  IF NOT _poll.multiple_choice THEN
    SELECT COUNT(*) INTO _existing_votes
    FROM public.poll_votes
    WHERE poll_id = NEW.poll_id AND user_id = NEW.user_id;

    IF _existing_votes > 0 THEN
      RAISE EXCEPTION 'Already voted in single-choice poll';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_poll_vote_before_insert
BEFORE INSERT ON public.poll_votes
FOR EACH ROW EXECUTE FUNCTION public.validate_poll_vote();

-- Fix 2: Drop broad profiles policy that exposes email/phone to group members
DROP POLICY IF EXISTS "Users can view profiles in same group" ON public.profiles;
