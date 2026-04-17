ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS competence_key text;

WITH computed_competence AS (
  SELECT
    p.id,
    to_char(
      CASE
        WHEN EXTRACT(
          DAY
          FROM (p.created_at AT TIME ZONE 'UTC')
        ) >= LEAST(
          GREATEST(1, COALESCE(g.closing_day, 25)),
          EXTRACT(
            DAY
            FROM (
              date_trunc('month', (p.created_at AT TIME ZONE 'UTC'))
              + interval '1 month - 1 day'
            )
          )::int
        )
          THEN date_trunc('month', (p.created_at AT TIME ZONE 'UTC')) + interval '1 month'
        ELSE date_trunc('month', (p.created_at AT TIME ZONE 'UTC'))
      END,
      'YYYY-MM'
    ) AS competence_key
  FROM public.payments p
  JOIN public.groups g ON g.id = p.group_id
  WHERE p.competence_key IS NULL
)
UPDATE public.payments p
SET competence_key = cc.competence_key
FROM computed_competence cc
WHERE p.id = cc.id;

ALTER TABLE public.payments
ALTER COLUMN competence_key SET NOT NULL;

ALTER TABLE public.payments
ADD CONSTRAINT payments_competence_key_format_check
CHECK (competence_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');

CREATE INDEX IF NOT EXISTS idx_payments_group_competence_key
ON public.payments (group_id, competence_key);
