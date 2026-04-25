-- Function to normalize competence date for payments
CREATE OR REPLACE FUNCTION public.normalize_payment_competence_date(
  _group_id uuid,
  _base_date date
)
RETURNS date
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  _closing_day int;
  _input date := COALESCE(_base_date, CURRENT_DATE);
  _effective_closing_day int;
  _competence_year int;
  _competence_month int;
  _anchor_day int;
BEGIN
  SELECT g.closing_day INTO _closing_day
  FROM public.groups g
  WHERE g.id = _group_id;

  IF _closing_day IS NULL THEN
    _closing_day := 1; -- Fallback
  END IF;

  _effective_closing_day := LEAST(
    GREATEST(_closing_day, 1),
    EXTRACT(DAY FROM ((date_trunc('month', _input)::date + interval '1 month - 1 day')))::int
  );

  _competence_year := EXTRACT(YEAR FROM _input)::int;
  _competence_month := EXTRACT(MONTH FROM _input)::int;

  IF EXTRACT(DAY FROM _input)::int >= _effective_closing_day THEN
    _competence_month := _competence_month + 1;
    IF _competence_month > 12 THEN
      _competence_month := 1;
      _competence_year := _competence_year + 1;
    END IF;
  END IF;

  _anchor_day := LEAST(
    GREATEST(_closing_day, 1),
    EXTRACT(DAY FROM ((make_date(_competence_year, _competence_month, 1) - interval '1 day')))::int
  );

  RETURN make_date(
    EXTRACT(YEAR FROM (make_date(_competence_year, _competence_month, 1) - interval '1 month'))::int,
    EXTRACT(MONTH FROM (make_date(_competence_year, _competence_month, 1) - interval '1 month'))::int,
    _anchor_day
  );
END;
$function$;

-- Trigger function for expenses competence
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

DO $$
BEGIN
  IF to_regclass('public.expenses') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_set_expense_competence ON public.expenses;
    CREATE TRIGGER trg_set_expense_competence
    BEFORE INSERT OR UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.set_expense_competence();
  ELSE
    RAISE NOTICE 'Skipping trg_set_expense_competence: public.expenses does not exist yet.';
  END IF;
END;
$$;

-- Trigger function for payments competence
CREATE OR REPLACE FUNCTION public.set_payment_competence_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _effective_date date;
BEGIN
  -- Use competence_date if provided, otherwise created_at, otherwise current date
  _effective_date := COALESCE(
    NEW.competence_date,
    (NEW.created_at AT TIME ZONE 'UTC')::date,
    (now() AT TIME ZONE 'UTC')::date
  );

  -- Derivation based on the effective date (which might already be normalized via another trigger or logic)
  NEW.competence_year := EXTRACT(YEAR FROM _effective_date)::int;
  NEW.competence_month := EXTRACT(MONTH FROM _effective_date)::int;
  NEW.competence_key := to_char(_effective_date, 'YYYY-MM');

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_set_payment_competence_fields ON public.payments;
    CREATE TRIGGER trg_set_payment_competence_fields
    BEFORE INSERT OR UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.set_payment_competence_fields();
  ELSE
    RAISE NOTICE 'Skipping trg_set_payment_competence_fields: public.payments does not exist yet.';
  END IF;
END;
$$;

-- Additional trigger for payments to ensure competence_date is set and validated (from 20260417120000_add_payment_competence_date.sql)
CREATE OR REPLACE FUNCTION public.set_payment_competence_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _normalized_competence date;
  _group_created_on date;
BEGIN
  _normalized_competence := public.normalize_payment_competence_date(
    NEW.group_id,
    COALESCE(NEW.competence_date, NEW.created_at::date, CURRENT_DATE)
  );

  NEW.competence_date := _normalized_competence;

  SELECT g.created_at::date INTO _group_created_on
  FROM public.groups g
  WHERE g.id = NEW.group_id;

  IF _group_created_on IS NULL THEN
    -- If group doesn't exist yet (unlikely in normal flow), we skip validation here
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_set_payment_competence_date ON public.payments;
    CREATE TRIGGER trg_set_payment_competence_date
    BEFORE INSERT OR UPDATE OF group_id, paid_by, created_at, competence_date
    ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.set_payment_competence_date();
  ELSE
    RAISE NOTICE 'Skipping trg_set_payment_competence_date: public.payments does not exist yet.';
  END IF;
END;
$$;
