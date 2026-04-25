SELECT pg_get_triggerdef(oid) 
FROM pg_trigger 
WHERE tgrelid = 'public.payments'::regclass 
AND tgname = 'trg_set_payment_competence';