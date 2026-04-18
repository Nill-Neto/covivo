CREATE OR REPLACE FUNCTION public.get_admin_member_competence_balances(
  _group_id uuid,
  _competence_key text
)
RETURNS TABLE(
  user_id uuid,
  previous_debt numeric,
  current_cycle_owed numeric,
  current_cycle_paid numeric,
  accrued_debt numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
WITH current_competence AS (
  SELECT to_date(_competence_key || '-01', 'YYYY-MM-DD') AS start_date
),
active_members AS (
  SELECT gm.user_id
  FROM public.group_members gm
  WHERE gm.group_id = _group_id
    AND gm.active = true
),
split_amounts AS (
  SELECT
    es.user_id,
    SUM(
      CASE
        WHEN expense_competence_date < cc.start_date THEN es.amount
        ELSE 0
      END
    ) AS previous_owed,
    SUM(
      CASE
        WHEN expense_competence_date = cc.start_date THEN es.amount
        ELSE 0
      END
    ) AS current_owed
  FROM public.expense_splits es
  JOIN public.expenses e ON e.id = es.expense_id
  CROSS JOIN current_competence cc
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN e.competence_key ~ '^[0-9]{4}-[0-9]{2}$'
        THEN to_date(e.competence_key || '-01', 'YYYY-MM-DD')
      WHEN e.competence_year IS NOT NULL AND e.competence_month IS NOT NULL
        THEN make_date(e.competence_year, e.competence_month, 1)
      ELSE NULL::date
    END AS expense_competence_date
  ) ec
  WHERE e.group_id = _group_id
    AND e.expense_type = 'collective'
    AND ec.expense_competence_date IS NOT NULL
  GROUP BY es.user_id
),
linked_payments AS (
  SELECT
    p.paid_by AS user_id,
    SUM(
      CASE
        WHEN expense_competence_date < cc.start_date THEN p.amount
        ELSE 0
      END
    ) AS previous_paid,
    SUM(
      CASE
        WHEN expense_competence_date = cc.start_date THEN p.amount
        ELSE 0
      END
    ) AS current_paid
  FROM public.payments p
  JOIN public.expense_splits es ON es.id = p.expense_split_id
  JOIN public.expenses e ON e.id = es.expense_id
  CROSS JOIN current_competence cc
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN e.competence_key ~ '^[0-9]{4}-[0-9]{2}$'
        THEN to_date(e.competence_key || '-01', 'YYYY-MM-DD')
      WHEN e.competence_year IS NOT NULL AND e.competence_month IS NOT NULL
        THEN make_date(e.competence_year, e.competence_month, 1)
      ELSE NULL::date
    END AS expense_competence_date
  ) ec
  WHERE p.group_id = _group_id
    AND p.status IN ('pending', 'confirmed')
    AND p.expense_split_id IS NOT NULL
    AND e.expense_type = 'collective'
    AND ec.expense_competence_date IS NOT NULL
  GROUP BY p.paid_by
),
bulk_payments AS (
  SELECT
    p.paid_by AS user_id,
    SUM(
      CASE
        WHEN payment_competence_date < cc.start_date THEN p.amount
        ELSE 0
      END
    ) AS previous_paid,
    SUM(
      CASE
        WHEN payment_competence_date = cc.start_date THEN p.amount
        ELSE 0
      END
    ) AS current_paid
  FROM public.payments p
  CROSS JOIN current_competence cc
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN p.competence_key ~ '^[0-9]{4}-[0-9]{2}$'
        THEN to_date(p.competence_key || '-01', 'YYYY-MM-DD')
      WHEN p.competence_year IS NOT NULL AND p.competence_month IS NOT NULL
        THEN make_date(p.competence_year, p.competence_month, 1)
      ELSE NULL::date
    END AS payment_competence_date
  ) pc
  WHERE p.group_id = _group_id
    AND p.status IN ('pending', 'confirmed')
    AND p.expense_split_id IS NULL
    AND pc.payment_competence_date IS NOT NULL
  GROUP BY p.paid_by
)
SELECT
  am.user_id,
  (
    COALESCE(sa.previous_owed, 0)
    - COALESCE(lp.previous_paid, 0)
    - COALESCE(bp.previous_paid, 0)
  ) AS previous_debt,
  COALESCE(sa.current_owed, 0) AS current_cycle_owed,
  (
    COALESCE(lp.current_paid, 0)
    + COALESCE(bp.current_paid, 0)
  ) AS current_cycle_paid,
  (
    COALESCE(sa.previous_owed, 0)
    + COALESCE(sa.current_owed, 0)
    - COALESCE(lp.previous_paid, 0)
    - COALESCE(lp.current_paid, 0)
    - COALESCE(bp.previous_paid, 0)
    - COALESCE(bp.current_paid, 0)
  ) AS accrued_debt
FROM active_members am
LEFT JOIN split_amounts sa ON sa.user_id = am.user_id
LEFT JOIN linked_payments lp ON lp.user_id = am.user_id
LEFT JOIN bulk_payments bp ON bp.user_id = am.user_id;
$function$;

GRANT EXECUTE ON FUNCTION public.get_admin_member_competence_balances(uuid, text) TO authenticated;
