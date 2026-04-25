ALTER TABLE public.payments RENAME COLUMN paid_by TO pagador_user_id;

ALTER TABLE public.payments ADD COLUMN recebedor_user_id UUID REFERENCES auth.users(id);

UPDATE public.payments p
SET recebedor_user_id = es.credor_user_id
FROM public.expense_splits es
WHERE p.expense_split_id = es.id;

UPDATE public.payments p
SET recebedor_user_id = g.created_by
FROM public.groups g
WHERE p.group_id = g.id AND p.recebedor_user_id IS NULL;

ALTER TABLE public.payments ALTER COLUMN recebedor_user_id SET NOT NULL;