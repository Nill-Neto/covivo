CREATE OR REPLACE FUNCTION public.claim_expense_payment(
  _expense_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _group_id uuid;
  _caller_id uuid := auth.uid();
BEGIN
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT e.group_id
  INTO _group_id
  FROM public.expenses e
  WHERE e.id = _expense_id;

  IF _group_id IS NULL THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;

  IF NOT public.has_role_in_group(_caller_id, _group_id, 'admin') THEN
    RAISE EXCEPTION 'Only group admins can claim expense payment';
  END IF;

  UPDATE public.expenses
  SET paid_to_provider = true
  WHERE id = _expense_id;

  UPDATE public.expense_splits
  SET
    status = 'pending',
    credor_user_id = _caller_id
  WHERE expense_id = _expense_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_expense_payment(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_expense_payment(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_expense_payment(uuid) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.claim_expense_payment(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_expense_payment(uuid) TO authenticated;
