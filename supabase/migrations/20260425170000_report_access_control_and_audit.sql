-- Harden report access validation and denied-attempt auditing helpers.

CREATE OR REPLACE FUNCTION public.is_current_user_member_of_group(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.is_member_of_group(auth.uid(), _group_id);
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_member_of_group(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_member_of_group(uuid) TO service_role;

CREATE TABLE IF NOT EXISTS public.report_access_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  allowed boolean NOT NULL,
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.report_access_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view own report access attempts" ON public.report_access_attempts;
CREATE POLICY "Members can view own report access attempts"
  ON public.report_access_attempts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "No direct inserts to report access attempts" ON public.report_access_attempts;
CREATE POLICY "No direct inserts to report access attempts"
  ON public.report_access_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "No updates to report access attempts" ON public.report_access_attempts;
CREATE POLICY "No updates to report access attempts"
  ON public.report_access_attempts
  FOR UPDATE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "No deletes from report access attempts" ON public.report_access_attempts;
CREATE POLICY "No deletes from report access attempts"
  ON public.report_access_attempts
  FOR DELETE
  TO authenticated
  USING (false);

CREATE INDEX IF NOT EXISTS idx_report_access_attempts_user_created_at
  ON public.report_access_attempts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_access_attempts_group_created_at
  ON public.report_access_attempts (group_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_report_access_attempt(
  _user_id uuid,
  _group_id uuid,
  _allowed boolean,
  _reason text DEFAULT NULL,
  _ip_address text DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Cannot log report access attempt for another user';
  END IF;

  INSERT INTO public.report_access_attempts (
    user_id,
    group_id,
    allowed,
    reason,
    ip_address,
    user_agent
  )
  VALUES (
    _user_id,
    _group_id,
    _allowed,
    _reason,
    _ip_address,
    _user_agent
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_report_access_attempt(uuid, uuid, boolean, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_report_access_attempt(uuid, uuid, boolean, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_recent_report_denied_attempts(
  _user_id uuid,
  _window_minutes integer DEFAULT 15
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Cannot read denied attempt rate for another user';
  END IF;

  SELECT count(*)::integer
    INTO _count
  FROM public.report_access_attempts
  WHERE user_id = _user_id
    AND allowed = false
    AND created_at >= (now() - make_interval(mins => GREATEST(_window_minutes, 1)));

  RETURN COALESCE(_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_report_denied_attempts(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_report_denied_attempts(uuid, integer) TO service_role;
