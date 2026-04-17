SELECT 
  '2026-03-09'::date as p_date,
  9 as closing_day,
  EXTRACT(DAY FROM '2026-03-09'::date) >= 9 as is_after_closing,
  to_char(CASE 
    WHEN EXTRACT(DAY FROM '2026-03-09'::date) >= 9 
    THEN (date_trunc('month', '2026-03-09'::date) + INTERVAL '1 month')::date
    ELSE date_trunc('month', '2026-03-09'::date)::date
  END, 'YYYY-MM') as result_key;