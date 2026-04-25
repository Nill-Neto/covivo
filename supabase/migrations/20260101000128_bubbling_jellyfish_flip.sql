CREATE OR REPLACE FUNCTION public.get_member_balances(_group_id uuid)
 RETURNS TABLE(user_id uuid, full_name text, avatar_url text, balance numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH group_payments AS (
    SELECT
      p.pagador_user_id as paid_by,
      COALESCE(SUM(p.amount), 0) as total_paid
    FROM payments p
    WHERE p.group_id = _group_id AND p.expense_split_id IS NULL
    GROUP BY p.pagador_user_id
  ),
  group_splits AS (
    SELECT
      s.user_id,
      COALESCE(SUM(s.amount), 0) as total_owed
    FROM expense_splits s
    JOIN expenses e ON s.expense_id = e.id
    WHERE e.group_id = _group_id AND e.expense_type = 'collective'
    GROUP BY s.user_id
  )
  SELECT
    gm.user_id,
    prof.full_name,
    prof.avatar_url,
    (COALESCE(gp.total_paid, 0) - COALESCE(gs.total_owed, 0)) AS balance
  FROM group_members gm
  LEFT JOIN group_payments gp ON gm.user_id = gp.paid_by
  LEFT JOIN group_splits gs ON gm.user_id = gs.user_id
  LEFT JOIN profiles prof ON gm.user_id = prof.id
  WHERE gm.group_id = _group_id AND gm.active = TRUE;
END;
$function$;