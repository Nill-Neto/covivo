-- Segregate internal scheduler authentication from user JWT flows.
-- The check-notifications edge function now expects x-scheduler-token
-- (instead of Authorization: Bearer <token>) when verify_jwt = false.

SELECT cron.unschedule('check-notifications-daily');

SELECT cron.schedule(
  'check-notifications-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mqorykrxvqfkifjkveqe.supabase.co/functions/v1/check-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-scheduler-token', public.get_check_notifications_scheduler_secret()
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
