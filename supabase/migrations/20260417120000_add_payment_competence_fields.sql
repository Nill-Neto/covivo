-- Persist payment competence explicitly so accounting logic does not depend on notes/created_at.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS competence_year int,
  ADD COLUMN IF NOT EXISTS competence_month int,
  ADD COLUMN IF NOT EXISTS competence_key text;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_competence_month_check
  CHECK (competence_month IS NULL OR competence_month BETWEEN 1 AND 12);

-- Backfill existing rows using the creation month/year as baseline competence.
UPDATE public.payments
SET
  competence_year = EXTRACT(YEAR FROM created_at)::int,
  competence_month = EXTRACT(MONTH FROM created_at)::int,
  competence_key = to_char(created_at, 'YYYY-MM')
WHERE competence_year IS NULL
  OR competence_month IS NULL
  OR competence_key IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_group_competence_status
  ON public.payments (group_id, competence_year, competence_month, status);
