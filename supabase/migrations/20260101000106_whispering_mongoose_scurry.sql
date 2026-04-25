SELECT tgname 
FROM pg_trigger 
WHERE tgrelid = 'public.payments'::regclass;