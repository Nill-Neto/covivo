DROP FUNCTION IF EXISTS public.claim_expense_payment(uuid, uuid);

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

  IF NOT public.is_member_of_group(_caller_id, _group_id) THEN
    RAISE EXCEPTION 'User is not a member of the group';
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

REVOKE ALL ON FUNCTION public.claim_expense_payment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_expense_payment(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.claim_expense_payment(uuid) FROM service_role;
REVOKE ALL ON FUNCTION public.claim_expense_payment(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_expense_payment(uuid) TO authenticated;
