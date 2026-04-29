CREATE TABLE IF NOT EXISTS public.expense_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  url text NOT NULL,
  mime_type text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_receipts_expense_id ON public.expense_receipts(expense_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_receipts_expense_position ON public.expense_receipts(expense_id, position);

ALTER TABLE public.expense_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view group expense receipts" ON public.expense_receipts;
CREATE POLICY "Members can view group expense receipts"
ON public.expense_receipts
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.expenses e
    JOIN public.group_members gm ON gm.group_id = e.group_id
    WHERE e.id = expense_id
      AND gm.user_id = auth.uid()
      AND gm.status = 'active'
  )
);

DROP POLICY IF EXISTS "Members can insert own group expense receipts" ON public.expense_receipts;
CREATE POLICY "Members can insert own group expense receipts"
ON public.expense_receipts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.expenses e
    WHERE e.id = expense_id
      AND e.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can update own group expense receipts" ON public.expense_receipts;
CREATE POLICY "Members can update own group expense receipts"
ON public.expense_receipts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.expenses e
    WHERE e.id = expense_id
      AND e.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.expenses e
    WHERE e.id = expense_id
      AND e.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can delete own group expense receipts" ON public.expense_receipts;
CREATE POLICY "Members can delete own group expense receipts"
ON public.expense_receipts
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.expenses e
    WHERE e.id = expense_id
      AND e.created_by = auth.uid()
  )
);
