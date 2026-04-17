-- Padroniza campos de competência em tabelas de parcelas,
-- mantendo bill_month/bill_year por compatibilidade.

ALTER TABLE public.expense_installments
  ADD COLUMN IF NOT EXISTS competence_year integer,
  ADD COLUMN IF NOT EXISTS competence_month integer;

ALTER TABLE public.personal_expense_installments
  ADD COLUMN IF NOT EXISTS competence_year integer,
  ADD COLUMN IF NOT EXISTS competence_month integer;

UPDATE public.expense_installments
SET
  competence_year = bill_year,
  competence_month = bill_month
WHERE competence_year IS NULL
   OR competence_month IS NULL;

UPDATE public.personal_expense_installments
SET
  competence_year = bill_year,
  competence_month = bill_month
WHERE competence_year IS NULL
   OR competence_month IS NULL;

ALTER TABLE public.expense_installments
  ALTER COLUMN competence_year SET NOT NULL,
  ALTER COLUMN competence_month SET NOT NULL;

ALTER TABLE public.personal_expense_installments
  ALTER COLUMN competence_year SET NOT NULL,
  ALTER COLUMN competence_month SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'expense_installments_competence_month_check'
  ) THEN
    ALTER TABLE public.expense_installments
      ADD CONSTRAINT expense_installments_competence_month_check
      CHECK (competence_month BETWEEN 1 AND 12);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'personal_expense_installments_competence_month_check'
  ) THEN
    ALTER TABLE public.personal_expense_installments
      ADD CONSTRAINT personal_expense_installments_competence_month_check
      CHECK (competence_month BETWEEN 1 AND 12);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.sync_expense_installment_competence_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.competence_year IS NULL THEN
    NEW.competence_year := NEW.bill_year;
  END IF;

  IF NEW.competence_month IS NULL THEN
    NEW.competence_month := NEW.bill_month;
  END IF;

  IF NEW.bill_year IS NULL THEN
    NEW.bill_year := NEW.competence_year;
  END IF;

  IF NEW.bill_month IS NULL THEN
    NEW.bill_month := NEW.competence_month;
  END IF;

  IF NEW.bill_year <> NEW.competence_year OR NEW.bill_month <> NEW.competence_month THEN
    RAISE EXCEPTION 'bill_year/bill_month must match competence_year/competence_month';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_personal_expense_installment_competence_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.competence_year IS NULL THEN
    NEW.competence_year := NEW.bill_year;
  END IF;

  IF NEW.competence_month IS NULL THEN
    NEW.competence_month := NEW.bill_month;
  END IF;

  IF NEW.bill_year IS NULL THEN
    NEW.bill_year := NEW.competence_year;
  END IF;

  IF NEW.bill_month IS NULL THEN
    NEW.bill_month := NEW.competence_month;
  END IF;

  IF NEW.bill_year <> NEW.competence_year OR NEW.bill_month <> NEW.competence_month THEN
    RAISE EXCEPTION 'bill_year/bill_month must match competence_year/competence_month';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_expense_installment_competence_fields ON public.expense_installments;
CREATE TRIGGER trg_sync_expense_installment_competence_fields
  BEFORE INSERT OR UPDATE ON public.expense_installments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_expense_installment_competence_fields();

DROP TRIGGER IF EXISTS trg_sync_personal_expense_installment_competence_fields ON public.personal_expense_installments;
CREATE TRIGGER trg_sync_personal_expense_installment_competence_fields
  BEFORE INSERT OR UPDATE ON public.personal_expense_installments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_personal_expense_installment_competence_fields();

CREATE INDEX IF NOT EXISTS expense_installments_competence_idx
  ON public.expense_installments (user_id, competence_year, competence_month);

CREATE INDEX IF NOT EXISTS personal_expense_installments_competence_idx
  ON public.personal_expense_installments (user_id, competence_year, competence_month);
