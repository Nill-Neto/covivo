SELECT 
  _comp_date,
  to_char(_comp_date, 'YYYY-MM') as key
FROM (
  SELECT (date_trunc('month', '2026-03-09'::date)::date + INTERVAL '1 month')::date as _comp_date
) s;