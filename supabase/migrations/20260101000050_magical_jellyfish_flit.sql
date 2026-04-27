CREATE OR REPLACE FUNCTION public.set_payment_competence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _group_closing_day int;
  _effective_closing_day int;
  _base_date date;
  _comp_date date;
BEGIN
  -- Use dedicated competence_date if provided, else created_at
  _base_date := COALESCE(NEW.competence_date, NEW.created_at::date, CURRENT_DATE);

  SELECT g.closing_day
  INTO _group_closing_day
  FROM public.groups g
  WHERE g.id = NEW.group_id;

  IF _group_closing_day IS NULL THEN
    _group_closing_day := 1;
  END IF;

  -- Calculate effective closing day (clamp to end of month)
  _effective_closing_day := LEAST(
    GREATEST(_group_closing_day, 1),
    EXTRACT(DAY FROM (date_trunc('month', _base_date)::date + INTERVAL '1 month - 1 day'))::int
  );

  _comp_date := date_trunc('month', _base_date)::date;

  -- If payment date is on or after closing day, it belongs to the next competence
  IF EXTRACT(DAY FROM _base_date)::int >= _effective_closing_day THEN
    _comp_date := (_comp_date + INTERVAL '1 month')::date;
  END IF;

  NEW.competence_year := EXTRACT(YEAR FROM _comp_date)::int;
  NEW.competence_month := EXTRACT(MONTH FROM _comp_date)::int;
  NEW.competence_key := to_char(_comp_date, 'YYYY-MM');
  
  -- Ensure competence_date is set for consistency
  NEW.competence_date := _base_date;

  RETURN NEW;
END;
$$;
