CREATE INDEX IF NOT EXISTS idx_expenses_group_competence
  ON public.expenses (group_id, competence_year, competence_month);

CREATE INDEX IF NOT EXISTS idx_payments_group_competence
  ON public.payments (group_id, competence_year, competence_month);

CREATE INDEX IF NOT EXISTS idx_payments_group_competence_date
  ON public.payments(group_id, competence_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_group_competence_status
  ON public.payments (group_id, competence_year, competence_month, status);
