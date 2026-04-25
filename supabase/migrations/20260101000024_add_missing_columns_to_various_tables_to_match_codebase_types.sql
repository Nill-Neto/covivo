DO $$
BEGIN
  -- expenses
  IF to_regclass('public.expenses') IS NOT NULL THEN
    ALTER TABLE public.expenses
      ADD COLUMN IF NOT EXISTS competence_key text,
      ADD COLUMN IF NOT EXISTS competence_year int,
      ADD COLUMN IF NOT EXISTS competence_month int;

    ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_competence_month_check;
    ALTER TABLE public.expenses ADD CONSTRAINT expenses_competence_month_check
      CHECK (competence_month IS NULL OR competence_month BETWEEN 1 AND 12);
  ELSE
    RAISE NOTICE 'Skipping expenses competence columns: public.expenses does not exist yet.';
  END IF;

  -- payments
  IF to_regclass('public.payments') IS NOT NULL THEN
    ALTER TABLE public.payments
      ADD COLUMN IF NOT EXISTS competence_key text,
      ADD COLUMN IF NOT EXISTS competence_year int,
      ADD COLUMN IF NOT EXISTS competence_month int,
      ADD COLUMN IF NOT EXISTS competence_date date;

    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_competence_month_check;
    ALTER TABLE public.payments ADD CONSTRAINT payments_competence_month_check
      CHECK (competence_month IS NULL OR competence_month BETWEEN 1 AND 12);
  ELSE
    RAISE NOTICE 'Skipping payments competence columns: public.payments does not exist yet.';
  END IF;

  -- personal_expenses
  IF to_regclass('public.personal_expenses') IS NOT NULL THEN
    ALTER TABLE public.personal_expenses
      ADD COLUMN IF NOT EXISTS competence_key text,
      ADD COLUMN IF NOT EXISTS competence_year int,
      ADD COLUMN IF NOT EXISTS competence_month int;

    ALTER TABLE public.personal_expenses DROP CONSTRAINT IF EXISTS personal_expenses_competence_month_check;
    ALTER TABLE public.personal_expenses ADD CONSTRAINT personal_expenses_competence_month_check
      CHECK (competence_month IS NULL OR competence_month BETWEEN 1 AND 12);
  ELSE
    RAISE NOTICE 'Skipping personal_expenses competence columns: public.personal_expenses does not exist yet.';
  END IF;

  -- expense_installments
  IF to_regclass('public.expense_installments') IS NOT NULL THEN
    ALTER TABLE public.expense_installments
      ADD COLUMN IF NOT EXISTS competence_year int,
      ADD COLUMN IF NOT EXISTS competence_month int;
  ELSE
    RAISE NOTICE 'Skipping expense_installments competence columns: public.expense_installments does not exist yet.';
  END IF;

  -- personal_expense_installments
  IF to_regclass('public.personal_expense_installments') IS NOT NULL THEN
    ALTER TABLE public.personal_expense_installments
      ADD COLUMN IF NOT EXISTS competence_year int,
      ADD COLUMN IF NOT EXISTS competence_month int;
  ELSE
    RAISE NOTICE 'Skipping personal_expense_installments competence columns: public.personal_expense_installments does not exist yet.';
  END IF;

  -- group_members
  IF to_regclass('public.group_members') IS NOT NULL THEN
    ALTER TABLE public.group_members
      ADD COLUMN IF NOT EXISTS is_resident boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS participates_in_collective_expenses_default boolean NOT NULL DEFAULT true;
  ELSE
    RAISE NOTICE 'Skipping group_members columns: public.group_members does not exist yet.';
  END IF;

  -- invites
  IF to_regclass('public.invites') IS NOT NULL THEN
    ALTER TABLE public.invites
      ADD COLUMN IF NOT EXISTS email_delivery_status text NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS email_error text,
      ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

    ALTER TABLE public.invites DROP CONSTRAINT IF EXISTS invites_email_delivery_status_check;
    ALTER TABLE public.invites ADD CONSTRAINT invites_email_delivery_status_check
      CHECK (email_delivery_status IN ('pending', 'sent', 'failed'));
  ELSE
    RAISE NOTICE 'Skipping invites email columns: public.invites does not exist yet.';
  END IF;
END;
$$;
