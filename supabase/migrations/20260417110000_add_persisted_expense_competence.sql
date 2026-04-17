-- Persist competence on expenses based on purchase_date + group closing_day

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS competence_year integer,
  ADD COLUMN IF NOT EXISTS competence_month integer,
  ADD COLUMN IF NOT EXISTS competence_key text;

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
BEFORE INSERT OR UPDATE OF purchase_date, group_id
ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.set_expense_competence();

-- Backfill existing rows using purchase_date + group closing_day
UPDATE public.expenses e
SET
  competence_year = EXTRACT(YEAR FROM comp.comp_date)::int,
  competence_month = EXTRACT(MONTH FROM comp.comp_date)::int,
  competence_key = to_char(comp.comp_date, 'YYYY-MM')
FROM (
  SELECT
    e2.id,
    (
      CASE
        WHEN EXTRACT(DAY FROM e2.purchase_date)::int >= LEAST(
          GREATEST(COALESCE(g.closing_day, 1), 1),
          EXTRACT(DAY FROM (date_trunc('month', e2.purchase_date)::date + INTERVAL '1 month - 1 day'))::int
        )
          THEN (date_trunc('month', e2.purchase_date)::date + INTERVAL '1 month')::date
        ELSE date_trunc('month', e2.purchase_date)::date
      END
    ) AS comp_date
  FROM public.expenses e2
  LEFT JOIN public.groups g ON g.id = e2.group_id
) comp
WHERE comp.id = e.id;

ALTER TABLE public.expenses
  ALTER COLUMN competence_year SET NOT NULL,
  ALTER COLUMN competence_month SET NOT NULL,
  ALTER COLUMN competence_key SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'expenses_competence_month_check'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_competence_month_check CHECK (competence_month BETWEEN 1 AND 12);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expenses_group_competence
  ON public.expenses (group_id, competence_year, competence_month);

CREATE INDEX IF NOT EXISTS idx_expenses_group_competence_key
  ON public.expenses (group_id, competence_key);
