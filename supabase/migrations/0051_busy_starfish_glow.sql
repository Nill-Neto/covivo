-- Re-backfill payments to align with group closing days
UPDATE public.payments p
SET
  competence_year = EXTRACT(YEAR FROM CASE 
    WHEN EXTRACT(DAY FROM COALESCE(p.competence_date, p.created_at::date)) >= COALESCE(g.closing_day, 1) 
    THEN (date_trunc('month', COALESCE(p.competence_date, p.created_at::date)) + INTERVAL '1 month')::date
    ELSE date_trunc('month', COALESCE(p.competence_date, p.created_at::date))::date
  END)::int,
  competence_month = EXTRACT(MONTH FROM CASE 
    WHEN EXTRACT(DAY FROM COALESCE(p.competence_date, p.created_at::date)) >= COALESCE(g.closing_day, 1) 
    THEN (date_trunc('month', COALESCE(p.competence_date, p.created_at::date)) + INTERVAL '1 month')::date
    ELSE date_trunc('month', COALESCE(p.competence_date, p.created_at::date))::date
  END)::int,
  competence_key = to_char(CASE 
    WHEN EXTRACT(DAY FROM COALESCE(p.competence_date, p.created_at::date)) >= COALESCE(g.closing_day, 1) 
    THEN (date_trunc('month', COALESCE(p.competence_date, p.created_at::date)) + INTERVAL '1 month')::date
    ELSE date_trunc('month', COALESCE(p.competence_date, p.created_at::date))::date
  END, 'YYYY-MM')
FROM public.groups g
WHERE p.group_id = g.id;
