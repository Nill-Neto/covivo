ALTER TABLE public.expense_splits
ADD COLUMN credor_user_id UUID REFERENCES auth.users(id);

UPDATE public.expense_splits es
SET credor_user_id = e.created_by
FROM public.expenses e
WHERE es.expense_id = e.id;

ALTER TABLE public.expense_splits
ALTER COLUMN credor_user_id SET NOT NULL;