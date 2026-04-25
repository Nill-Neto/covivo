-- Single source of truth for check-notifications scheduler secret:
--   Supabase Vault secret named 'check_notifications_scheduler_secret'.
--
-- Rotation playbook (also documented in docs/runbooks/check-notifications-secret-rotation.md):
-- 1) SELECT vault.create_secret('<new-secret>', 'check_notifications_scheduler_secret');
-- 2) Re-run this migration (or execute only the cron.schedule statements below) to ensure
--    the next cron executions use the latest Vault value.

CREATE EXTENSION IF NOT EXISTS vault WITH SCHEMA vault;

CREATE OR REPLACE FUNCTION public.get_check_notifications_scheduler_secret()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  _secret text;
BEGIN
  SELECT decrypted_secret
  INTO _secret
  FROM vault.decrypted_secrets
  WHERE name = 'check_notifications_scheduler_secret'
  ORDER BY created_at DESC
  LIMIT 1;

  IF _secret IS NULL OR length(_secret) = 0 THEN
    RAISE EXCEPTION 'Vault secret check_notifications_scheduler_secret is missing';
  END IF;

  RETURN _secret;
END;
$$;

REVOKE ALL ON FUNCTION public.get_check_notifications_scheduler_secret() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_check_notifications_scheduler_secret() FROM anon;
REVOKE ALL ON FUNCTION public.get_check_notifications_scheduler_secret() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_check_notifications_scheduler_secret() TO service_role;

CREATE TABLE IF NOT EXISTS public.cron_execution_alerts (
  request_id bigint PRIMARY KEY,
  job_name text NOT NULL,
  status_code integer,
  timed_out boolean NOT NULL DEFAULT false,
  error_msg text,
  response_body text,
  detected_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cron_execution_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can read cron execution alerts" ON public.cron_execution_alerts;
CREATE POLICY "Service role can read cron execution alerts"
ON public.cron_execution_alerts
FOR SELECT
TO service_role
USING (true);

DROP POLICY IF EXISTS "Service role can insert cron execution alerts" ON public.cron_execution_alerts;
CREATE POLICY "Service role can insert cron execution alerts"
ON public.cron_execution_alerts
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.monitor_check_notifications_cron_failures()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  _inserted integer := 0;
BEGIN
  WITH failed_responses AS (
    SELECT
      r.id AS request_id,
      'check-notifications-daily'::text AS job_name,
      r.status_code,
      coalesce(r.timed_out, false) AS timed_out,
      r.error_msg,
      CASE
        WHEN r.content IS NULL THEN NULL
        ELSE convert_from(r.content, 'UTF8')
      END AS response_body
    FROM net._http_response r
    WHERE r.created > now() - interval '2 hours'
      AND (
        r.status_code < 200
        OR r.status_code >= 300
        OR coalesce(r.timed_out, false)
        OR r.error_msg IS NOT NULL
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.cron_execution_alerts a
        WHERE a.request_id = r.id
      )
  ), inserted AS (
    INSERT INTO public.cron_execution_alerts (request_id, job_name, status_code, timed_out, error_msg, response_body)
    SELECT request_id, job_name, status_code, timed_out, error_msg, response_body
    FROM failed_responses
    RETURNING request_id, status_code, error_msg
  )
  SELECT count(*) INTO _inserted FROM inserted;

  IF _inserted > 0 THEN
    PERFORM pg_notify(
      'cron_alerts',
      json_build_object(
        'job_name', 'check-notifications-daily',
        'new_failures', _inserted,
        'detected_at', now()
      )::text
    );
  END IF;

  RETURN _inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.monitor_check_notifications_cron_failures() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.monitor_check_notifications_cron_failures() FROM anon;
REVOKE ALL ON FUNCTION public.monitor_check_notifications_cron_failures() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.monitor_check_notifications_cron_failures() TO postgres;

SELECT cron.unschedule('check-notifications-daily');
SELECT cron.unschedule('check-notifications-failure-monitor');

SELECT cron.schedule(
  'check-notifications-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mqorykrxvqfkifjkveqe.supabase.co/functions/v1/check-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.get_check_notifications_scheduler_secret()
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'check-notifications-failure-monitor',
  '*/10 * * * *',
  $$
  SELECT public.monitor_check_notifications_cron_failures();
  $$
);
