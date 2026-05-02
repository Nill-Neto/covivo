CREATE OR REPLACE FUNCTION public.get_my_p2p_balances()
RETURNS TABLE(
  other_user_id uuid,
  other_user_full_name text,
  other_user_avatar_url text,
  net_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller_id uuid := auth.uid();
BEGIN
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  WITH pending_balances AS (
    SELECT
      CASE
        WHEN es.user_id = _caller_id THEN es.credor_user_id
        ELSE es.user_id
      END AS counterparty_id,
      CASE
        WHEN es.credor_user_id = _caller_id THEN es.amount
        ELSE -es.amount
      END AS signed_amount
    FROM public.expense_splits es
    JOIN public.expenses e ON e.id = es.expense_id
    WHERE es.status = 'pending'
      AND (_caller_id = es.user_id OR _caller_id = es.credor_user_id)
      AND es.user_id <> es.credor_user_id
      AND EXISTS (
        SELECT 1
        FROM public.group_members gm_caller
        WHERE gm_caller.group_id = e.group_id
          AND gm_caller.user_id = _caller_id
          AND gm_caller.active = true
      )
      AND EXISTS (
        SELECT 1
        FROM public.group_members gm_other
        WHERE gm_other.group_id = e.group_id
          AND gm_other.user_id = CASE
            WHEN es.user_id = _caller_id THEN es.credor_user_id
            ELSE es.user_id
          END
          AND gm_other.active = true
      )
  ),
  aggregated AS (
    SELECT
      pb.counterparty_id,
      SUM(pb.signed_amount) AS total_balance
    FROM pending_balances pb
    GROUP BY pb.counterparty_id
    HAVING SUM(pb.signed_amount) <> 0
  )
  SELECT
    a.counterparty_id,
    p.full_name,
    p.avatar_url,
    a.total_balance
  FROM aggregated a
  JOIN public.profiles p ON p.id = a.counterparty_id;
END;
$function$;
