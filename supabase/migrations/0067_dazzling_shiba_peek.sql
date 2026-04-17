SELECT pg_get_triggerdef(oid), tgname 
FROM pg_trigger 
WHERE tgrelid = 'public.payments'::regclass 
AND tgname IN ('trg_set_payment_competence_date', 'trg_set_payment_competence_fields');