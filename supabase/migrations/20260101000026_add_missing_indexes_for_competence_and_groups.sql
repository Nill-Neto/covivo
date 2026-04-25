DO $$
BEGIN
  IF to_regclass('public.expenses') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_expenses_group_competence
      ON public.expenses (group_id, competence_year, competence_month);
  ELSE
    RAISE NOTICE 'Skipping idx_expenses_group_competence: public.expenses does not exist yet.';
  END IF;

  IF to_regclass('public.payments') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_payments_group_competence
      ON public.payments (group_id, competence_year, competence_month);

    CREATE INDEX IF NOT EXISTS idx_payments_group_competence_date
      ON public.payments(group_id, competence_date DESC);

    CREATE INDEX IF NOT EXISTS idx_payments_group_competence_status
      ON public.payments (group_id, competence_year, competence_month, status);
  ELSE
    RAISE NOTICE 'Skipping payments competence indexes: public.payments does not exist yet.';
  END IF;
END;
$$;
