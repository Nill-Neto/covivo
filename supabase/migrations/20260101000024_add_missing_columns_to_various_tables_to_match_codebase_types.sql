-- Competence baseline (squashed): structural columns/functions/indexes/backfill/triggers.

-- 1) Estrutura: colunas e constraints de domínio
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS competence_key text,
  ADD COLUMN IF NOT EXISTS competence_year int,
  ADD COLUMN IF NOT EXISTS competence_month int;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS competence_key text,
  ADD COLUMN IF NOT EXISTS competence_year int,
  ADD COLUMN IF NOT EXISTS competence_month int,
  ADD COLUMN IF NOT EXISTS competence_date date;

ALTER TABLE public.personal_expenses
  ADD COLUMN IF NOT EXISTS competence_key text,
  ADD COLUMN IF NOT EXISTS competence_year int,
  ADD COLUMN IF NOT EXISTS competence_month int;

ALTER TABLE public.expense_installments
  ADD COLUMN IF NOT EXISTS competence_year int,
  ADD COLUMN IF NOT EXISTS competence_month int;

ALTER TABLE public.personal_expense_installments
  ADD COLUMN IF NOT EXISTS competence_year int,
  ADD COLUMN IF NOT EXISTS competence_month int;

ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS is_resident boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS participates_in_collective_expenses_default boolean NOT NULL DEFAULT true;

ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS email_delivery_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS email_error text,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

-- 2) Alterações: funções de derivação/normalização
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
    _closing_day := 1;
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

CREATE OR REPLACE FUNCTION public.set_payment_competence_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _effective_date date;
BEGIN
  _effective_date := COALESCE(
    NEW.competence_date,
    (NEW.created_at AT TIME ZONE 'UTC')::date,
    (now() AT TIME ZONE 'UTC')::date
  );

  NEW.competence_year := EXTRACT(YEAR FROM _effective_date)::int;
  NEW.competence_month := EXTRACT(MONTH FROM _effective_date)::int;
  NEW.competence_key := to_char(_effective_date, 'YYYY-MM');

  RETURN NEW;
END;
$$;

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
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) Backfill: normalização de dados existentes
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

UPDATE public.payments p
SET competence_date = public.normalize_payment_competence_date(
  p.group_id,
  COALESCE(p.competence_date, p.created_at::date)
)
WHERE p.competence_date IS NULL;

UPDATE public.payments p
SET
  competence_year = EXTRACT(YEAR FROM p.competence_date)::int,
  competence_month = EXTRACT(MONTH FROM p.competence_date)::int,
  competence_key = to_char(p.competence_date, 'YYYY-MM')
WHERE p.competence_year IS NULL OR p.competence_month IS NULL OR p.competence_key IS NULL;

UPDATE public.personal_expenses
SET
  competence_year = EXTRACT(YEAR FROM purchase_date)::int,
  competence_month = EXTRACT(MONTH FROM purchase_date)::int,
  competence_key = to_char(purchase_date, 'YYYY-MM')
WHERE competence_year IS NULL OR competence_month IS NULL OR competence_key IS NULL;

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

-- 4) Constraints e índices finais
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_competence_month_check;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_competence_month_check
  CHECK (competence_month IS NULL OR competence_month BETWEEN 1 AND 12);

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_competence_month_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_competence_month_check
  CHECK (competence_month IS NULL OR competence_month BETWEEN 1 AND 12);

ALTER TABLE public.personal_expenses DROP CONSTRAINT IF EXISTS personal_expenses_competence_month_check;
ALTER TABLE public.personal_expenses
  ADD CONSTRAINT personal_expenses_competence_month_check
  CHECK (competence_month IS NULL OR competence_month BETWEEN 1 AND 12);

ALTER TABLE public.invites DROP CONSTRAINT IF EXISTS invites_email_delivery_status_check;
ALTER TABLE public.invites
  ADD CONSTRAINT invites_email_delivery_status_check
  CHECK (email_delivery_status IN ('pending', 'sent', 'failed'));

CREATE INDEX IF NOT EXISTS idx_expenses_group_competence
  ON public.expenses (group_id, competence_year, competence_month);

CREATE INDEX IF NOT EXISTS idx_payments_group_competence
  ON public.payments (group_id, competence_year, competence_month);

CREATE INDEX IF NOT EXISTS idx_payments_group_competence_date
  ON public.payments (group_id, competence_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_group_competence_status
  ON public.payments (group_id, competence_year, competence_month, status);

DROP TRIGGER IF EXISTS trg_set_expense_competence ON public.expenses;
CREATE TRIGGER trg_set_expense_competence
BEFORE INSERT OR UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.set_expense_competence();

DROP TRIGGER IF EXISTS trg_set_payment_competence_fields ON public.payments;
CREATE TRIGGER trg_set_payment_competence_fields
BEFORE INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.set_payment_competence_fields();

DROP TRIGGER IF EXISTS trg_set_payment_competence_date ON public.payments;
CREATE TRIGGER trg_set_payment_competence_date
BEFORE INSERT OR UPDATE OF group_id, paid_by, created_at, competence_date
ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.set_payment_competence_date();
