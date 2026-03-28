-- Recreate notifications cron job to authenticate with dedicated scheduler secret.
-- Configure/rotate secret with:
--   ALTER ROLE postgres SET app.settings.check_notifications_scheduler_secret = '<new-secret>';

SELECT cron.unschedule('check-notifications-daily');

SELECT cron.schedule(
  'check-notifications-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mqorykrxvqfkifjkveqe.supabase.co/functions/v1/check-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.check_notifications_scheduler_secret', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
