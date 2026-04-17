-- 1. Backfill Expenses
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

-- 2. Backfill Payments
-- First ensure competence_date is set using the existing function
UPDATE public.payments p
SET competence_date = public.normalize_payment_competence_date(
  p.group_id,
  COALESCE(p.competence_date, p.created_at::date)
)
WHERE p.competence_date IS NULL;

-- Then sync the other fields based on the now-set competence_date
UPDATE public.payments p
SET
  competence_year = EXTRACT(YEAR FROM p.competence_date)::int,
  competence_month = EXTRACT(MONTH FROM p.competence_date)::int,
  competence_key = to_char(p.competence_date, 'YYYY-MM')
WHERE competence_year IS NULL OR competence_month IS NULL OR competence_key IS NULL;

-- 3. Backfill Personal Expenses (Defaulting to month of purchase)
UPDATE public.personal_expenses
SET
  competence_year = EXTRACT(YEAR FROM purchase_date)::int,
  competence_month = EXTRACT(MONTH FROM purchase_date)::int,
  competence_key = to_char(purchase_date, 'YYYY-MM')
WHERE competence_year IS NULL OR competence_month IS NULL OR competence_key IS NULL;

-- 4. Backfill Installments (Matching the billing month for consistency)
UPDATE public.expense_installments
SET
  competence_year = bill_year,
  competence_month = bill_month
WHERE competence_year IS NULL OR competence_month IS NULL;

UPDATE public.personal_expense_installments
SET
  competence_year = bill_year,
  competence_month = bill_month
WHERE competence_year IS NULL OR competence_month IS NULL;
