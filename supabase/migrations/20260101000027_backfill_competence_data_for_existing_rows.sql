DO $$
BEGIN
  -- 1. Backfill Expenses
  IF to_regclass('public.expenses') IS NOT NULL AND to_regclass('public.groups') IS NOT NULL THEN
    UPDATE public.expenses e
    SET
      competence_year = EXTRACT(YEAR FROM CASE
        WHEN EXTRACT(DAY FROM COALESCE(e.purchase_date, e.created_at::date)) >= COALESCE(g.closing_day, 1)
        THEN (date_trunc('month', COALESCE(e.purchase_date, e.created_at::date)) + INTERVAL '1 month')::date
        ELSE date_trunc('month', COALESCE(e.purchase_date, e.created_at::date))::date
      END)::int,
      competence_month = EXTRACT(MONTH FROM CASE
        WHEN EXTRACT(DAY FROM COALESCE(e.purchase_date, e.created_at::date)) >= COALESCE(g.closing_day, 1)
        THEN (date_trunc('month', COALESCE(e.purchase_date, e.created_at::date)) + INTERVAL '1 month')::date
        ELSE date_trunc('month', COALESCE(e.purchase_date, e.created_at::date))::date
      END)::int,
      competence_key = to_char(CASE
        WHEN EXTRACT(DAY FROM COALESCE(e.purchase_date, e.created_at::date)) >= COALESCE(g.closing_day, 1)
        THEN (date_trunc('month', COALESCE(e.purchase_date, e.created_at::date)) + INTERVAL '1 month')::date
        ELSE date_trunc('month', COALESCE(e.purchase_date, e.created_at::date))::date
      END, 'YYYY-MM')
    FROM public.groups g
    WHERE e.group_id = g.id
      AND (e.competence_year IS NULL OR e.competence_month IS NULL OR e.competence_key IS NULL);
  ELSE
    RAISE NOTICE 'Skipping expense competence backfill: public.expenses/public.groups not available yet.';
  END IF;

  -- 2. Backfill Payments
  IF to_regclass('public.payments') IS NOT NULL
     AND to_regprocedure('public.normalize_payment_competence_date(uuid,date)') IS NOT NULL THEN
    UPDATE public.payments p
    SET competence_date = public.normalize_payment_competence_date(
      p.group_id,
      COALESCE(p.competence_date, p.created_at::date)
    )
    WHERE p.competence_date IS NULL;

    UPDATE public.payments p
    SET
      competence_year = EXTRACT(YEAR FROM p.competence_date)::int,
      competence_month = EXTRACT(MONTH FROM p.competence_date)::int,
      competence_key = to_char(p.competence_date, 'YYYY-MM')
    WHERE competence_year IS NULL OR competence_month IS NULL OR competence_key IS NULL;
  ELSE
    RAISE NOTICE 'Skipping payments competence backfill: payments table or normalize function not available yet.';
  END IF;

  -- 3. Backfill Personal Expenses (Defaulting to month of purchase)
  IF to_regclass('public.personal_expenses') IS NOT NULL THEN
    UPDATE public.personal_expenses
    SET
      competence_year = EXTRACT(YEAR FROM purchase_date)::int,
      competence_month = EXTRACT(MONTH FROM purchase_date)::int,
      competence_key = to_char(purchase_date, 'YYYY-MM')
    WHERE competence_year IS NULL OR competence_month IS NULL OR competence_key IS NULL;
  ELSE
    RAISE NOTICE 'Skipping personal_expenses competence backfill: public.personal_expenses does not exist yet.';
  END IF;

  -- 4. Backfill Installments (Matching the billing month for consistency)
  IF to_regclass('public.expense_installments') IS NOT NULL THEN
    UPDATE public.expense_installments
    SET
      competence_year = bill_year,
      competence_month = bill_month
    WHERE competence_year IS NULL OR competence_month IS NULL;
  ELSE
    RAISE NOTICE 'Skipping expense_installments competence backfill: table does not exist yet.';
  END IF;

  IF to_regclass('public.personal_expense_installments') IS NOT NULL THEN
    UPDATE public.personal_expense_installments
    SET
      competence_year = bill_year,
      competence_month = bill_month
    WHERE competence_year IS NULL OR competence_month IS NULL;
  ELSE
    RAISE NOTICE 'Skipping personal_expense_installments competence backfill: table does not exist yet.';
  END IF;
END;
$$;
