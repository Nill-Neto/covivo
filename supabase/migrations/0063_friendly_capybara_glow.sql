CREATE OR REPLACE FUNCTION public.set_expense_competence()
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
  -- If competence_key is explicitly provided and changed (or it's an insert), 
  -- sync year/month from it and stop.
  IF NEW.competence_key IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.competence_key IS DISTINCT FROM OLD.competence_key) THEN
    BEGIN
      NEW.competence_year := split_part(NEW.competence_key, '-', 1)::int;
      NEW.competence_month := split_part(NEW.competence_key, '-', 2)::int;
      RETURN NEW;
    EXCEPTION WHEN OTHERS THEN
      -- Fallback to date-based calculation if key format is invalid
    END;
  END IF;

  -- Default calculation based on purchase_date + closing_day
  _base_date := COALESCE(NEW.purchase_date, CURRENT_DATE);

  SELECT g.closing_day
  INTO _group_closing_day
  FROM public.groups g
  WHERE g.id = NEW.group_id;

  IF _group_closing_day IS NULL THEN
    _group_closing_day := 1;
  END IF;

  _effective_closing_day := LEAST(
    GREATEST(_group_closing_day, 1),
    EXTRACT(DAY FROM (date_trunc('month', _base_date)::date + INTERVAL '1 month - 1 day'))::int
  );

  _comp_date := date_trunc('month', _base_date)::date;

  IF EXTRACT(DAY FROM _base_date)::int >= _effective_closing_day THEN
    _comp_date := (_comp_date + INTERVAL '1 month')::date;
  END IF;

  NEW.competence_year := EXTRACT(YEAR FROM _comp_date)::int;
  NEW.competence_month := EXTRACT(MONTH FROM _comp_date)::int;
  NEW.competence_key := to_char(_comp_date, 'YYYY-MM');

  RETURN NEW;
END;
$$;

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
  -- If competence_key is explicitly provided and changed (or it's an insert), 
  -- sync year/month from it and stop.
  IF NEW.competence_key IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.competence_key IS DISTINCT FROM OLD.competence_key) THEN
    BEGIN
      NEW.competence_year := split_part(NEW.competence_key, '-', 1)::int;
      NEW.competence_month := split_part(NEW.competence_key, '-', 2)::int;
      RETURN NEW;
    EXCEPTION WHEN OTHERS THEN
      -- Fallback
    END;
  END IF;

  -- Default calculation
  _base_date := COALESCE(NEW.competence_date, NEW.created_at::date, CURRENT_DATE);

  SELECT g.closing_day
  INTO _group_closing_day
  FROM public.groups g
  WHERE g.id = NEW.group_id;

  IF _group_closing_day IS NULL THEN
    _group_closing_day := 1;
  END IF;

  _effective_closing_day := LEAST(
    GREATEST(_group_closing_day, 1),
    EXTRACT(DAY FROM (date_trunc('month', _base_date)::date + INTERVAL '1 month - 1 day'))::int
  );

  _comp_date := date_trunc('month', _base_date)::date;

  IF EXTRACT(DAY FROM _base_date)::int >= _effective_closing_day THEN
    _comp_date := (_comp_date + INTERVAL '1 month')::date;
  END IF;

  NEW.competence_year := EXTRACT(YEAR FROM _comp_date)::int;
  NEW.competence_month := EXTRACT(MONTH FROM _comp_date)::int;
  NEW.competence_key := to_char(_comp_date, 'YYYY-MM');
  
  NEW.competence_date := _base_date;

  RETURN NEW;
END;
$$;
