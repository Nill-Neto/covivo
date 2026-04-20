-- Ensure competence fields exist on expenses and payments
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS competence_year int,
  ADD COLUMN IF NOT EXISTS competence_month int;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS competence_year int,
  ADD COLUMN IF NOT EXISTS competence_month int;

-- Enforce valid competence month values (1-12)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'expenses_competence_month_check'
      AND conrelid = 'public.expenses'::regclass
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_competence_month_check
      CHECK (competence_month IS NULL OR competence_month BETWEEN 1 AND 12);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_competence_month_check'
      AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_competence_month_check
      CHECK (competence_month IS NULL OR competence_month BETWEEN 1 AND 12);
  END IF;
END $$;

-- Composite indexes for group + competence lookup
CREATE INDEX IF NOT EXISTS idx_expenses_group_competence
  ON public.expenses (group_id, competence_year, competence_month);

CREATE INDEX IF NOT EXISTS idx_payments_group_competence
  ON public.payments (group_id, competence_year, competence_month);
