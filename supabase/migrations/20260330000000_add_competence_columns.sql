-- 1. Create the utility function to calculate competence exactly like the frontend
CREATE OR REPLACE FUNCTION get_competence_key(ref_date timestamp with time zone, closing_day integer)
RETURNS varchar AS $$
DECLARE
  comp_year integer;
  comp_month integer;
  ref_day integer;
  last_day_of_month integer;
  effective_closing_day integer;
BEGIN
  IF ref_date IS NULL THEN
    RETURN NULL;
  END IF;

  comp_year := EXTRACT(YEAR FROM ref_date);
  comp_month := EXTRACT(MONTH FROM ref_date);
  ref_day := EXTRACT(DAY FROM ref_date);

  -- Determine the last day of the month for the reference date
  last_day_of_month := EXTRACT(DAY FROM (date_trunc('month', ref_date) + interval '1 month - 1 day'));
  
  -- Clamp closing_day
  effective_closing_day := LEAST(closing_day, last_day_of_month);
  effective_closing_day := GREATEST(1, effective_closing_day);

  IF ref_day >= effective_closing_day THEN
    comp_month := comp_month + 1;
    IF comp_month > 12 THEN
      comp_month := 1;
      comp_year := comp_year + 1;
    END IF;
  END IF;

  RETURN comp_year::varchar || '-' || LPAD(comp_month::varchar, 2, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Add competence columns
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS competence VARCHAR(7);
ALTER TABLE public.personal_expenses ADD COLUMN IF NOT EXISTS competence VARCHAR(7);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS competence VARCHAR(7);

-- 3. Backfill existing data
UPDATE public.expenses e
SET competence = get_competence_key(
  e.purchase_date::timestamp with time zone,
  COALESCE(
    (SELECT closing_day FROM public.credit_cards cc WHERE cc.id = e.credit_card_id),
    (SELECT closing_day FROM public.groups g WHERE g.id = e.group_id),
    1
  )
)
WHERE e.competence IS NULL;

UPDATE public.personal_expenses pe
SET competence = get_competence_key(
  pe.purchase_date::timestamp with time zone,
  COALESCE(
    (SELECT closing_day FROM public.credit_cards cc WHERE cc.id = pe.credit_card_id),
    1
  )
)
WHERE pe.competence IS NULL;

UPDATE public.payments p
SET competence = get_competence_key(
  p.created_at,
  COALESCE((SELECT closing_day FROM public.groups g WHERE g.id = p.group_id), 1)
)
WHERE p.competence IS NULL;

-- 4. Update the RPC create_expense_with_splits to accept _competence
DROP FUNCTION IF EXISTS public.create_expense_with_splits(uuid, text, text, numeric, text, text, date, text, uuid, uuid, text, uuid, integer, date);
DROP FUNCTION IF EXISTS public.create_expense_with_splits(uuid, text, text, numeric, text, text, date, text, uuid, uuid, text, uuid, integer, date, uuid[]);

CREATE OR REPLACE FUNCTION public.create_expense_with_splits(
  _group_id uuid,
  _title text,
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
  _participant_user_ids uuid[] DEFAULT NULL::uuid[],
  _competence text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _expense_id uuid;
  _caller_id uuid := auth.uid();
  _member record;
  _member_count int;
  _split_amount numeric(12,2);
  _group_rule text;
  _final_purchase_date date;
  _per_installment numeric(12,2);
  _closing_day int;
  _bill_month int;
  _bill_year int;
  _bill_base date;
  _calc_competence text;
BEGIN
  _final_purchase_date := COALESCE(_purchase_date, CURRENT_DATE);

  IF NOT has_role_in_group(_caller_id, _group_id, 'admin') AND _expense_type = 'collective' THEN
    RAISE EXCEPTION 'Apenas administradores podem criar despesas coletivas';
  END IF;

  IF _competence IS NULL THEN
    IF _credit_card_id IS NOT NULL THEN
      SELECT closing_day INTO _closing_day FROM public.credit_cards WHERE id = _credit_card_id;
    ELSE
      SELECT closing_day INTO _closing_day FROM public.groups WHERE id = _group_id;
    END IF;
    _calc_competence := get_competence_key(_final_purchase_date::timestamp with time zone, COALESCE(_closing_day, 1));
  ELSE
    _calc_competence := _competence;
  END IF;

  INSERT INTO public.expenses (
    group_id, created_by, title, description, amount, category,
    expense_type, due_date, receipt_url, recurring_expense_id,
    payment_method, credit_card_id, installments, purchase_date, competence
  ) VALUES (
    _group_id, _caller_id, _title, _description, _amount, _category,
    _expense_type, _due_date, _receipt_url, _recurring_expense_id,
    _payment_method, _credit_card_id, _installments, _final_purchase_date, _calc_competence
  ) RETURNING id INTO _expense_id;

  IF _expense_type = 'individual' THEN
    INSERT INTO expense_splits (expense_id, user_id, amount)
    VALUES (_expense_id, COALESCE(_target_user_id, _caller_id), _amount);
  ELSE
    IF _participant_user_ids IS NOT NULL AND array_length(_participant_user_ids, 1) > 0 THEN
      _member_count := array_length(_participant_user_ids, 1);
      _split_amount := round(_amount / _member_count, 2);
      FOR i IN 1.._member_count LOOP
        INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (_expense_id, _participant_user_ids[i], _split_amount);
      END LOOP;
    ELSE
      SELECT splitting_rule::text INTO _group_rule FROM public.groups WHERE id = _group_id;
      IF _group_rule = 'equal' THEN
        SELECT count(*) INTO _member_count FROM public.group_members
        WHERE group_id = _group_id AND active = true AND participates_in_splits = true;
        
        IF _member_count > 0 THEN
          _split_amount := round(_amount / _member_count, 2);
          FOR _member IN SELECT user_id FROM public.group_members
            WHERE group_id = _group_id AND active = true AND participates_in_splits = true LOOP
            INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (_expense_id, _member.user_id, _split_amount);
          END LOOP;
        END IF;
      ELSE
        FOR _member IN SELECT user_id, coalesce(split_percentage, 0) as pct FROM public.group_members
          WHERE group_id = _group_id AND active = true AND participates_in_splits = true LOOP
          _split_amount := round(_amount * _member.pct / 100, 2);
          INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (_expense_id, _member.user_id, _split_amount);
        END LOOP;
      END IF;
    END IF;
  END IF;

  IF _payment_method = 'credit_card' AND _credit_card_id IS NOT NULL AND _installments > 0 THEN
    SELECT closing_day INTO _closing_day FROM public.credit_cards WHERE id = _credit_card_id;
    _bill_base := _final_purchase_date;
    IF EXTRACT(DAY FROM _final_purchase_date) > _closing_day THEN
      _bill_base := _bill_base + interval '1 month';
    END IF;
    _per_installment := round(_amount / _installments, 2);
    FOR i IN 1.._installments LOOP
      _bill_month := EXTRACT(MONTH FROM _bill_base + ((i-1) * interval '1 month'));
      _bill_year := EXTRACT(YEAR FROM _bill_base + ((i-1) * interval '1 month'));
      INSERT INTO public.expense_installments (user_id, expense_id, installment_number, amount, bill_month, bill_year)
      VALUES (_caller_id, _expense_id, i, _per_installment, _bill_month, _bill_year);
    END LOOP;
  END IF;

  RETURN _expense_id;
END;
$function$;