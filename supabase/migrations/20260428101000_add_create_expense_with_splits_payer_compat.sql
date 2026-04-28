-- Backward-compatible RPC overload for clients that still send `_payer_id`.
-- This wrapper delegates to the canonical function signature that includes `_competence`.
CREATE OR REPLACE FUNCTION public.create_expense_with_splits(
  _group_id uuid,
  _title text,
  _payer_id uuid,
  _description text DEFAULT NULL::text,
  _amount numeric DEFAULT 0,
  _category text DEFAULT 'other'::text,
  _expense_type text DEFAULT 'collective'::text,
  _due_date date DEFAULT NULL::date,
  _receipt_url text DEFAULT NULL::text,
  _recurring_expense_id uuid DEFAULT NULL::uuid,
  _target_user_id uuid DEFAULT NULL::uuid,
  _payment_method text DEFAULT 'cash'::text,
  _credit_card_id uuid DEFAULT NULL::uuid,
  _installments integer DEFAULT 1,
  _purchase_date date DEFAULT NULL::date,
  _participant_user_ids uuid[] DEFAULT NULL::uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.create_expense_with_splits(
    _group_id := _group_id,
    _title := _title,
    _description := _description,
    _amount := _amount,
    _category := _category,
    _expense_type := _expense_type,
    _due_date := _due_date,
    _receipt_url := _receipt_url,
    _recurring_expense_id := _recurring_expense_id,
    _target_user_id := _target_user_id,
    _payment_method := _payment_method,
    _credit_card_id := _credit_card_id,
    _installments := _installments,
    _purchase_date := _purchase_date,
    _participant_user_ids := _participant_user_ids,
    _competence := NULL
  );
END;
$function$;
