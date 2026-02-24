
-- Remove old cron job with hardcoded anon key
SELECT cron.unschedule('check-notifications-daily');

-- Re-create without Authorization header (verify_jwt = false, no auth needed)
SELECT cron.schedule(
  'check-notifications-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mqorykrxvqfkifjkveqe.supabase.co/functions/v1/check-notifications',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
