-- Ensure competence fields are always derived server-side on write.
-- expenses: purchase_date + groups.closing_day
-- payments: effective payment date (fallback to created_at when no dedicated payment date exists)

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

DROP TRIGGER IF EXISTS trg_set_expense_competence ON public.expenses;

CREATE TRIGGER trg_set_expense_competence
BEFORE INSERT OR UPDATE
ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.set_expense_competence();

CREATE OR REPLACE FUNCTION public.set_payment_competence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _effective_payment_date date;
BEGIN
  -- payments has no dedicated payment-date field yet;
  -- use created_at only as input for competence derivation.
  _effective_payment_date := COALESCE(
    (NEW.created_at AT TIME ZONE 'UTC')::date,
    (now() AT TIME ZONE 'UTC')::date
  );

  NEW.competence_year := EXTRACT(YEAR FROM _effective_payment_date)::int;
  NEW.competence_month := EXTRACT(MONTH FROM _effective_payment_date)::int;

  NEW.competence_key := to_char(_effective_payment_date, 'YYYY-MM');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_payment_competence ON public.payments;

CREATE TRIGGER trg_set_payment_competence
BEFORE INSERT OR UPDATE
ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.set_payment_competence();
