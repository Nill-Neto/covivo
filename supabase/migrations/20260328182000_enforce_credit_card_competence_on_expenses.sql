-- Enforce credit-card business rules at DB level to avoid frontend/schema cache mismatches:
-- 1) credit-card expense is always paid to provider
-- 2) when card closes before group and card is already closed while group competence is still open,
--    move purchase_date to group closing day (same month) so expense enters next competence

CREATE OR REPLACE FUNCTION public.enforce_credit_card_expense_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _card_closing_day int;
  _group_closing_day int;
  _effective_group_closing_day int;
  _purchase_day int;
BEGIN
  IF NEW.payment_method <> 'credit_card' THEN
    RETURN NEW;
  END IF;

  NEW.paid_to_provider := true;

  IF NEW.credit_card_id IS NULL OR NEW.purchase_date IS NULL OR NEW.group_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT closing_day INTO _card_closing_day
  FROM public.credit_cards
  WHERE id = NEW.credit_card_id;

  SELECT closing_day INTO _group_closing_day
  FROM public.groups
  WHERE id = NEW.group_id;

  IF _card_closing_day IS NULL OR _group_closing_day IS NULL THEN
    RETURN NEW;
  END IF;

  _effective_group_closing_day := LEAST(
    _group_closing_day,
    EXTRACT(DAY FROM (date_trunc('month', NEW.purchase_date)::date + INTERVAL '1 month - 1 day'))::int
  );
  _purchase_day := EXTRACT(DAY FROM NEW.purchase_date)::int;

  IF _card_closing_day < _effective_group_closing_day
     AND _purchase_day > _card_closing_day
     AND _purchase_day < _effective_group_closing_day THEN
    NEW.purchase_date := make_date(
      EXTRACT(YEAR FROM NEW.purchase_date)::int,
      EXTRACT(MONTH FROM NEW.purchase_date)::int,
      _effective_group_closing_day
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_credit_card_expense_rules ON public.expenses;

CREATE TRIGGER trg_enforce_credit_card_expense_rules
BEFORE INSERT OR UPDATE OF payment_method, credit_card_id, purchase_date, group_id, paid_to_provider
ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.enforce_credit_card_expense_rules();
