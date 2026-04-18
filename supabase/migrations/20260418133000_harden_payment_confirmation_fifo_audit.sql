-- Harden payment confirmation with deterministic FIFO allocation, idempotency,
-- and immutable audit metadata for reconciliation.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS allocation_batch_id uuid,
  ADD COLUMN IF NOT EXISTS balance_before numeric(12,2),
  ADD COLUMN IF NOT EXISTS balance_after numeric(12,2),
  ADD COLUMN IF NOT EXISTS allocation_breakdown jsonb;

COMMENT ON COLUMN public.payments.allocation_batch_id IS
  'Batch id that groups all split allocations generated during payment confirmation.';
COMMENT ON COLUMN public.payments.balance_before IS
  'Outstanding balance (pending splits) before running payment confirmation allocation.';
COMMENT ON COLUMN public.payments.balance_after IS
  'Outstanding balance (pending splits) after running payment confirmation allocation.';
COMMENT ON COLUMN public.payments.allocation_breakdown IS
  'Audit payload with per-competence allocation totals and per-split allocation details.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_confirmed_receipt_idempotency
  ON public.payments (group_id, paid_by, receipt_url)
  WHERE status = 'confirmed' AND receipt_url IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_payment_history_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  _confirmation_ctx text := coalesce(current_setting('app.payment_confirmation_context', true), 'false');
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Once a payment is confirmed/rejected, freeze row mutations from normal DML.
  IF OLD.status IN ('confirmed', 'rejected')
     AND _confirmation_ctx <> 'true'
     AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN
    RAISE EXCEPTION 'Payment history is immutable once finalized';
  END IF;

  -- Allocation/audit fields can only be written by the confirmation routine context.
  IF _confirmation_ctx <> 'true' THEN
    IF NEW.allocation_batch_id IS DISTINCT FROM OLD.allocation_batch_id
      OR NEW.balance_before IS DISTINCT FROM OLD.balance_before
      OR NEW.balance_after IS DISTINCT FROM OLD.balance_after
      OR NEW.allocation_breakdown IS DISTINCT FROM OLD.allocation_breakdown THEN
      RAISE EXCEPTION 'Allocation audit metadata can only be written by confirm_payment';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_payment_history_immutability ON public.payments;
CREATE TRIGGER trg_guard_payment_history_immutability
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.guard_payment_history_immutability();

CREATE OR REPLACE FUNCTION public.guard_expense_split_payment_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  _confirmation_ctx text := coalesce(current_setting('app.payment_confirmation_context', true), 'false');
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Only confirmation routine can mark a split as paid.
  IF NEW.status = 'paid' AND OLD.status <> 'paid' AND _confirmation_ctx <> 'true' THEN
    RAISE EXCEPTION 'Only confirm_payment can settle expense splits';
  END IF;

  -- Keep paid history immutable.
  IF OLD.status = 'paid'
     AND _confirmation_ctx <> 'true'
     AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.paid_at IS DISTINCT FROM OLD.paid_at) THEN
    RAISE EXCEPTION 'Paid split history is immutable';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_expense_split_payment_history ON public.expense_splits;
CREATE TRIGGER trg_guard_expense_split_payment_history
BEFORE UPDATE OF status, paid_at ON public.expense_splits
FOR EACH ROW
EXECUTE FUNCTION public.guard_expense_split_payment_history();

CREATE OR REPLACE FUNCTION public.confirm_payment(
  _payment_id uuid,
  _status text DEFAULT 'confirmed'::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _payment record;
  _caller_id uuid := auth.uid();
  _remaining_amount numeric(12,2);
  _applied_amount numeric(12,2) := 0;
  _balance_before numeric(12,2) := 0;
  _balance_after numeric(12,2) := 0;
  _allocation_batch_id uuid := gen_random_uuid();
  _allocation_by_competence jsonb := '{}'::jsonb;
  _allocation_items jsonb := '[]'::jsonb;
  _split record;
  _competence_key text;
  _current_comp_total numeric(12,2);
BEGIN
  IF _status NOT IN ('confirmed', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT *
  INTO _payment
  FROM public.payments
  WHERE id = _payment_id
  FOR UPDATE;

  IF _payment IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF NOT public.has_role_in_group(_caller_id, _payment.group_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can confirm payments';
  END IF;

  -- Idempotency guard: do nothing if already finalized with the same status.
  IF _payment.status = _status AND _payment.status IN ('confirmed', 'rejected') THEN
    RETURN;
  END IF;

  IF _payment.status IN ('confirmed', 'rejected') AND _payment.status <> _status THEN
    RAISE EXCEPTION 'Payment already finalized with status %', _payment.status;
  END IF;

  IF _status = 'rejected' THEN
    UPDATE public.payments
    SET status = 'rejected',
        confirmed_by = _caller_id,
        confirmed_at = now()
    WHERE id = _payment_id;

    PERFORM public.create_notification(
      _payment.paid_by,
      _payment.group_id,
      'Pagamento recusado',
      'Seu pagamento de R$ ' || _payment.amount || ' foi recusado.',
      'payment_rejected',
      jsonb_build_object('payment_id', _payment_id::text, 'amount', _payment.amount)
    );

    PERFORM public.create_audit_log(
      _payment.group_id,
      _caller_id,
      'rejected',
      'payment',
      _payment_id,
      jsonb_build_object('amount', _payment.amount, 'paid_by', _payment.paid_by::text)
    );

    RETURN;
  END IF;

  PERFORM set_config('app.payment_confirmation_context', 'true', true);

  SELECT coalesce(sum(es.amount), 0)::numeric(12,2)
  INTO _balance_before
  FROM public.expense_splits es
  JOIN public.expenses e ON e.id = es.expense_id
  WHERE e.group_id = _payment.group_id
    AND es.user_id = _payment.paid_by
    AND es.status = 'pending';

  _remaining_amount := _payment.amount;

  FOR _split IN
    SELECT
      es.id,
      es.amount,
      coalesce(e.competence_key, to_char(e.created_at::date, 'YYYY-MM')) AS competence_key
    FROM public.expense_splits es
    JOIN public.expenses e ON e.id = es.expense_id
    WHERE e.group_id = _payment.group_id
      AND es.user_id = _payment.paid_by
      AND es.status = 'pending'
      AND (
        _payment.expense_split_id IS NULL
        OR es.id = _payment.expense_split_id
      )
    ORDER BY
      e.competence_year NULLS LAST,
      e.competence_month NULLS LAST,
      e.due_date NULLS LAST,
      e.created_at,
      es.created_at,
      es.id
    FOR UPDATE OF es
  LOOP
    EXIT WHEN _remaining_amount <= 0;

    IF _split.amount <= _remaining_amount THEN
      UPDATE public.expense_splits
      SET status = 'paid',
          paid_at = now()
      WHERE id = _split.id
        AND status = 'pending';

      IF FOUND THEN
        _remaining_amount := (_remaining_amount - _split.amount)::numeric(12,2);
        _applied_amount := (_applied_amount + _split.amount)::numeric(12,2);

        _competence_key := coalesce(_split.competence_key, 'unknown');
        _current_comp_total := coalesce((_allocation_by_competence ->> _competence_key)::numeric, 0);
        _allocation_by_competence := jsonb_set(
          _allocation_by_competence,
          array[_competence_key],
          to_jsonb((_current_comp_total + _split.amount)::numeric(12,2)),
          true
        );

        _allocation_items := _allocation_items || jsonb_build_array(
          jsonb_build_object(
            'expense_split_id', _split.id,
            'competence_key', _competence_key,
            'allocated_amount', _split.amount
          )
        );
      END IF;
    END IF;
  END LOOP;

  SELECT coalesce(sum(es.amount), 0)::numeric(12,2)
  INTO _balance_after
  FROM public.expense_splits es
  JOIN public.expenses e ON e.id = es.expense_id
  WHERE e.group_id = _payment.group_id
    AND es.user_id = _payment.paid_by
    AND es.status = 'pending';

  UPDATE public.payments
  SET status = 'confirmed',
      confirmed_by = _caller_id,
      confirmed_at = now(),
      allocation_batch_id = _allocation_batch_id,
      balance_before = _balance_before,
      balance_after = _balance_after,
      allocation_breakdown = jsonb_build_object(
        'allocation_batch_id', _allocation_batch_id,
        'payment_amount', _payment.amount,
        'applied_amount', _applied_amount,
        'unapplied_amount', _remaining_amount,
        'balance_before', _balance_before,
        'balance_after', _balance_after,
        'by_competence', _allocation_by_competence,
        'allocations', _allocation_items
      )
  WHERE id = _payment_id;

  PERFORM public.create_notification(
    _payment.paid_by,
    _payment.group_id,
    'Pagamento confirmado',
    'Seu pagamento de R$ ' || _payment.amount || ' foi confirmado.',
    'payment_confirmed',
    jsonb_build_object(
      'payment_id', _payment_id::text,
      'amount', _payment.amount,
      'allocation_batch_id', _allocation_batch_id::text,
      'applied_amount', _applied_amount,
      'remaining_amount', _remaining_amount
    )
  );

  PERFORM public.create_audit_log(
    _payment.group_id,
    _caller_id,
    'confirmed',
    'payment',
    _payment_id,
    jsonb_build_object(
      'amount', _payment.amount,
      'paid_by', _payment.paid_by::text,
      'allocation_batch_id', _allocation_batch_id::text,
      'balance_before', _balance_before,
      'balance_after', _balance_after,
      'applied_amount', _applied_amount,
      'unapplied_amount', _remaining_amount,
      'allocation_by_competence', _allocation_by_competence
    )
  );
END;
$function$;

-- Keep audit_log write-protected for direct DML.
DROP POLICY IF EXISTS "No direct inserts to audit log" ON public.audit_log;
DROP POLICY IF EXISTS "No updates to audit log" ON public.audit_log;
DROP POLICY IF EXISTS "No deletes from audit log" ON public.audit_log;

CREATE POLICY "No direct inserts to audit log"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "No updates to audit log"
  ON public.audit_log FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No deletes from audit log"
  ON public.audit_log FOR DELETE TO authenticated
  USING (false);
