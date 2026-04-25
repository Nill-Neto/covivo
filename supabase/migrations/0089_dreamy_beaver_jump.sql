CREATE OR REPLACE FUNCTION public.confirm_payment(_payment_id uuid, _status text DEFAULT 'confirmed'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _payment record;
  _caller_id uuid := auth.uid();
BEGIN
  SELECT * INTO _payment FROM public.payments WHERE id = _payment_id;

  IF _payment IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF NOT has_role_in_group(_caller_id, _payment.group_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can confirm payments';
  END IF;

  IF _status NOT IN ('confirmed', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE public.payments
  SET status = _status, confirmed_by = _caller_id, confirmed_at = now()
  WHERE id = _payment_id;

  -- If confirmed, update split status
  IF _status = 'confirmed' AND _payment.expense_split_id IS NOT NULL THEN
    UPDATE public.expense_splits
    SET status = 'paid', paid_at = now()
    WHERE id = _payment.expense_split_id;
  END IF;

  -- Notify payer
  PERFORM create_notification(
    _payment.pagador_user_id, _payment.group_id,
    CASE WHEN _status = 'confirmed' THEN 'Pagamento confirmado' ELSE 'Pagamento recusado' END,
    CASE WHEN _status = 'confirmed' THEN 'Seu pagamento de R$ ' || _payment.amount || ' foi confirmado.'
         ELSE 'Seu pagamento de R$ ' || _payment.amount || ' foi recusado.' END,
    'payment_' || _status,
    jsonb_build_object('payment_id', _payment_id::text, 'amount', _payment.amount)
  );

  -- Audit
  PERFORM create_audit_log(_payment.group_id, _caller_id, _status, 'payment', _payment_id,
    jsonb_build_object('amount', _payment.amount, 'paid_by', _payment.pagador_user_id::text));
END;
$function$;