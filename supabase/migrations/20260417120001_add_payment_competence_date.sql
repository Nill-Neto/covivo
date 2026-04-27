-- Add explicit competence field for payments and centralize derivation in backend.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS competence_date date;

COMMENT ON COLUMN public.payments.competence_date IS
  'Data âncora da competência do pagamento (definida pelo backend conforme fechamento do grupo).';

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
    RAISE EXCEPTION 'Group % not found or missing closing_day', _group_id;
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

CREATE OR REPLACE FUNCTION public.set_payment_competence_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _normalized_competence date;
  _membership_valid boolean;
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
    RAISE EXCEPTION 'Invalid group_id % for payment competence validation', NEW.group_id;
  END IF;

  IF NEW.competence_date < _group_created_on THEN
    RAISE EXCEPTION 'Payment competence % cannot be before group creation date %', NEW.competence_date, _group_created_on;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = NEW.group_id
      AND gm.user_id = NEW.paid_by
      AND gm.joined_at::date <= NEW.competence_date
      AND (gm.left_at IS NULL OR gm.left_at::date > NEW.competence_date)
  ) INTO _membership_valid;

  IF NOT _membership_valid THEN
    RAISE EXCEPTION 'Payment competence % is invalid for payer membership in group %', NEW.competence_date, NEW.group_id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_set_payment_competence_date ON public.payments;
CREATE TRIGGER trg_set_payment_competence_date
BEFORE INSERT OR UPDATE OF group_id, paid_by, created_at, competence_date
ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.set_payment_competence_date();

UPDATE public.payments p
SET competence_date = public.normalize_payment_competence_date(
  p.group_id,
  COALESCE(p.competence_date, p.created_at::date)
)
WHERE p.competence_date IS NULL;

ALTER TABLE public.payments
  ALTER COLUMN competence_date SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_group_competence_date
  ON public.payments(group_id, competence_date DESC);
