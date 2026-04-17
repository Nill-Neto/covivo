-- Backfill competence fields and enforce NOT NULL after validating remnant nulls.
-- Rules:
--   expenses -> purchase_date + groups.closing_day
--   payments -> created_at + groups.closing_day (historical compatibility)

-- 1) Expenses backfill with same competence rule used in app/trigger.
UPDATE public.expenses e
SET
  competence_year = EXTRACT(YEAR FROM comp.comp_date)::int,
  competence_month = EXTRACT(MONTH FROM comp.comp_date)::int,
  competence_key = to_char(comp.comp_date, 'YYYY-MM')
FROM (
  SELECT
    e2.id,
    CASE
      WHEN EXTRACT(DAY FROM e2.purchase_date)::int >= LEAST(
        GREATEST(COALESCE(g.closing_day, 1), 1),
        EXTRACT(DAY FROM (date_trunc('month', e2.purchase_date)::date + INTERVAL '1 month - 1 day'))::int
      )
        THEN (date_trunc('month', e2.purchase_date)::date + INTERVAL '1 month')::date
      ELSE date_trunc('month', e2.purchase_date)::date
    END AS comp_date
  FROM public.expenses e2
  LEFT JOIN public.groups g ON g.id = e2.group_id
) comp
WHERE comp.id = e.id
  AND (
    e.competence_year IS NULL
    OR e.competence_month IS NULL
    OR e.competence_key IS NULL
  );

-- 2) Payments backfill with created_at + groups.closing_day.
UPDATE public.payments p
SET
  competence_year = EXTRACT(YEAR FROM comp.comp_date)::int,
  competence_month = EXTRACT(MONTH FROM comp.comp_date)::int,
  competence_key = to_char(comp.comp_date, 'YYYY-MM')
FROM (
  SELECT
    p2.id,
    CASE
      WHEN EXTRACT(DAY FROM (p2.created_at AT TIME ZONE 'UTC'))::int >= LEAST(
        GREATEST(COALESCE(g.closing_day, 1), 1),
        EXTRACT(
          DAY
          FROM (
            date_trunc('month', (p2.created_at AT TIME ZONE 'UTC'))
            + INTERVAL '1 month - 1 day'
          )
        )::int
      )
        THEN (date_trunc('month', (p2.created_at AT TIME ZONE 'UTC')) + INTERVAL '1 month')::date
      ELSE date_trunc('month', (p2.created_at AT TIME ZONE 'UTC'))::date
    END AS comp_date
  FROM public.payments p2
  LEFT JOIN public.groups g ON g.id = p2.group_id
) comp
WHERE comp.id = p.id
  AND (
    p.competence_year IS NULL
    OR p.competence_month IS NULL
    OR p.competence_key IS NULL
    OR p.competence_year <> EXTRACT(YEAR FROM comp.comp_date)::int
    OR p.competence_month <> EXTRACT(MONTH FROM comp.comp_date)::int
    OR p.competence_key <> to_char(comp.comp_date, 'YYYY-MM')
  );

-- 3) Validate remaining nulls before constraints.
DO $$
DECLARE
  _expenses_null_count bigint;
  _payments_null_count bigint;
BEGIN
  SELECT COUNT(*)
    INTO _expenses_null_count
  FROM public.expenses
  WHERE competence_year IS NULL
    OR competence_month IS NULL
    OR competence_key IS NULL;

  IF _expenses_null_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on expenses competence fields. Remaining rows with nulls: %', _expenses_null_count;
  END IF;

  SELECT COUNT(*)
    INTO _payments_null_count
  FROM public.payments
  WHERE competence_year IS NULL
    OR competence_month IS NULL
    OR competence_key IS NULL;

  IF _payments_null_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on payments competence fields. Remaining rows with nulls: %', _payments_null_count;
  END IF;
END
$$;

-- 4) Apply NOT NULL constraints.
ALTER TABLE public.expenses
  ALTER COLUMN competence_year SET NOT NULL,
  ALTER COLUMN competence_month SET NOT NULL,
  ALTER COLUMN competence_key SET NOT NULL;

ALTER TABLE public.payments
  ALTER COLUMN competence_year SET NOT NULL,
  ALTER COLUMN competence_month SET NOT NULL,
  ALTER COLUMN competence_key SET NOT NULL;
