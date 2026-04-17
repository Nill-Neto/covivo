-- Force update of competence keys for all expenses to ensure 100% consistency with UI logic
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
WHERE e.group_id = g.id;
