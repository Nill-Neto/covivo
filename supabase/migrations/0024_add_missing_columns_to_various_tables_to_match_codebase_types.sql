-- expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS competence_key text,
  ADD COLUMN IF NOT EXISTS competence_year int,
  ADD COLUMN IF NOT EXISTS competence_month int;

-- payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS competence_key text,
  ADD COLUMN IF NOT EXISTS competence_year int,
  ADD COLUMN IF NOT EXISTS competence_month int,
  ADD COLUMN IF NOT EXISTS competence_date date;

-- personal_expenses
ALTER TABLE public.personal_expenses
  ADD COLUMN IF NOT EXISTS competence_key text,
  ADD COLUMN IF NOT EXISTS competence_year int,
  ADD COLUMN IF NOT EXISTS competence_month int;

-- expense_installments
ALTER TABLE public.expense_installments
  ADD COLUMN IF NOT EXISTS competence_year int,
  ADD COLUMN IF NOT EXISTS competence_month int;

-- personal_expense_installments
ALTER TABLE public.personal_expense_installments
  ADD COLUMN IF NOT EXISTS competence_year int,
  ADD COLUMN IF NOT EXISTS competence_month int;

-- group_members
ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS is_resident boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS participates_in_collective_expenses_default boolean NOT NULL DEFAULT true;

-- invites
ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS email_delivery_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS email_error text,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

-- Add constraints for competence month
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_competence_month_check;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_competence_month_check CHECK (competence_month IS NULL OR competence_month BETWEEN 1 AND 12);

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_competence_month_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_competence_month_check CHECK (competence_month IS NULL OR competence_month BETWEEN 1 AND 12);

ALTER TABLE public.personal_expenses DROP CONSTRAINT IF EXISTS personal_expenses_competence_month_check;
ALTER TABLE public.personal_expenses ADD CONSTRAINT personal_expenses_competence_month_check CHECK (competence_month IS NULL OR competence_month BETWEEN 1 AND 12);

ALTER TABLE public.invites DROP CONSTRAINT IF EXISTS invites_email_delivery_status_check;
ALTER TABLE public.invites ADD CONSTRAINT invites_email_delivery_status_check CHECK (email_delivery_status in ('pending', 'sent', 'failed'));
