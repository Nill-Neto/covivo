-- Align existing credit-card expenses with new business rules:
-- 1) credit-card expenses are considered paid to provider
-- 2) if card closes before group and card already closed while group competence is still open,
--    move purchase_date to the group's closing date for that month (next competence boundary)

WITH expense_scope AS (
  SELECT
    e.id,
    e.purchase_date,
    cc.closing_day AS card_closing_day,
    LEAST(
      g.closing_day,
      EXTRACT(
        DAY FROM (
          date_trunc('month', e.purchase_date)::date + INTERVAL '1 month - 1 day'
        )
      )::int
    ) AS effective_group_closing_day
  FROM public.expenses e
  JOIN public.groups g ON g.id = e.group_id
  JOIN public.credit_cards cc ON cc.id = e.credit_card_id
  WHERE e.payment_method = 'credit_card'
    AND e.credit_card_id IS NOT NULL
),
expenses_to_shift AS (
  SELECT
    id,
    make_date(
      EXTRACT(YEAR FROM purchase_date)::int,
      EXTRACT(MONTH FROM purchase_date)::int,
      effective_group_closing_day
    ) AS new_purchase_date
  FROM expense_scope
  WHERE card_closing_day < effective_group_closing_day
    AND EXTRACT(DAY FROM purchase_date)::int > card_closing_day
    AND EXTRACT(DAY FROM purchase_date)::int < effective_group_closing_day
)
UPDATE public.expenses e
SET purchase_date = s.new_purchase_date,
    updated_at = now()
FROM expenses_to_shift s
WHERE e.id = s.id
  AND e.purchase_date <> s.new_purchase_date;

UPDATE public.expenses
SET paid_to_provider = true,
    updated_at = now()
WHERE payment_method = 'credit_card'
  AND COALESCE(paid_to_provider, false) = false;
