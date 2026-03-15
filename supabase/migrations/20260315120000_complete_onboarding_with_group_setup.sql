-- Idempotency registry for onboarding finish operation
CREATE TABLE IF NOT EXISTS public.onboarding_operation_locks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_id text NOT NULL,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, operation_id)
);

ALTER TABLE public.onboarding_operation_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own onboarding operation locks" ON public.onboarding_operation_locks;
CREATE POLICY "Users can view own onboarding operation locks"
ON public.onboarding_operation_locks
FOR SELECT
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.complete_onboarding_with_group_setup(
  _operation_id text,
  _name text,
  _description text DEFAULT NULL,
  _splitting_rule splitting_rule DEFAULT 'equal',
  _closing_day integer DEFAULT 1,
  _due_day integer DEFAULT 10,
  _street text DEFAULT NULL,
  _street_number text DEFAULT NULL,
  _complement text DEFAULT NULL,
  _neighborhood text DEFAULT NULL,
  _city text DEFAULT NULL,
  _state text DEFAULT NULL,
  _zip_code text DEFAULT NULL,
  _admin_participates_in_splits boolean DEFAULT true,
  _recurring_expenses jsonb DEFAULT '[]'::jsonb,
  _fees jsonb DEFAULT '[]'::jsonb,
  _house_rules jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _group_id uuid;
  _user_id uuid := auth.uid();
  _rec jsonb;
  _fee jsonb;
  _rule jsonb;
  _next_due_date date;
  _rule_index integer := 0;
  _raw_amount text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'PERMISSION: usuário não autenticado' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(btrim(_operation_id), '') = '' THEN
    RAISE EXCEPTION 'VALIDATION: operation_id é obrigatório' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(btrim(_name), '') = '' THEN
    RAISE EXCEPTION 'VALIDATION: nome do grupo é obrigatório' USING ERRCODE = '22023';
  END IF;

  IF _closing_day < 1 OR _closing_day > 31 THEN
    RAISE EXCEPTION 'VALIDATION: closing_day deve estar entre 1 e 31' USING ERRCODE = '22023';
  END IF;

  IF _due_day < 1 OR _due_day > 31 THEN
    RAISE EXCEPTION 'VALIDATION: due_day deve estar entre 1 e 31' USING ERRCODE = '22023';
  END IF;

  SELECT group_id INTO _group_id
  FROM public.onboarding_operation_locks
  WHERE user_id = _user_id
    AND operation_id = _operation_id;

  IF _group_id IS NOT NULL THEN
    RETURN jsonb_build_object('group_id', _group_id, 'idempotent_replay', true);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.user_id = _user_id
      AND gm.active = true
  ) THEN
    RAISE EXCEPTION 'CONFLICT: usuário já possui grupo ativo' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.groups (name, description, splitting_rule, created_by)
  VALUES (btrim(_name), NULLIF(btrim(_description), ''), _splitting_rule, _user_id)
  RETURNING id INTO _group_id;

  INSERT INTO public.group_members (group_id, user_id, participates_in_splits)
  VALUES (_group_id, _user_id, _admin_participates_in_splits);

  INSERT INTO public.user_roles (user_id, group_id, role)
  VALUES (_user_id, _group_id, 'admin');

  UPDATE public.groups
  SET
    street = NULLIF(btrim(_street), ''),
    street_number = NULLIF(btrim(_street_number), ''),
    complement = NULLIF(btrim(_complement), ''),
    neighborhood = NULLIF(btrim(_neighborhood), ''),
    city = NULLIF(btrim(_city), ''),
    state = NULLIF(btrim(_state), ''),
    zip_code = NULLIF(regexp_replace(COALESCE(_zip_code, ''), '\\D', '', 'g'), ''),
    closing_day = _closing_day,
    due_day = _due_day
  WHERE id = _group_id;

  _next_due_date := (date_trunc('month', current_date) + interval '1 month')::date;

  FOR _rec IN SELECT value FROM jsonb_array_elements(COALESCE(_recurring_expenses, '[]'::jsonb)) AS value LOOP
    _raw_amount := _rec ->> 'amount';
    IF COALESCE(btrim(_rec ->> 'title'), '') = '' OR COALESCE(btrim(_raw_amount), '') = '' THEN
      CONTINUE;
    END IF;

    INSERT INTO public.recurring_expenses (
      group_id,
      created_by,
      title,
      amount,
      category,
      frequency,
      next_due_date,
      expense_type
    )
    VALUES (
      _group_id,
      _user_id,
      btrim(_rec ->> 'title'),
      _raw_amount::numeric,
      COALESCE(NULLIF(btrim(_rec ->> 'category'), ''), 'other'),
      'monthly',
      _next_due_date,
      'collective'
    );
  END LOOP;

  FOR _fee IN SELECT value FROM jsonb_array_elements(COALESCE(_fees, '[]'::jsonb)) AS value LOOP
    _raw_amount := _fee ->> 'amount';
    IF COALESCE(btrim(_fee ->> 'title'), '') = '' OR COALESCE(btrim(_raw_amount), '') = '' THEN
      CONTINUE;
    END IF;

    INSERT INTO public.group_fees (
      group_id,
      title,
      amount,
      fee_type,
      description
    )
    VALUES (
      _group_id,
      btrim(_fee ->> 'title'),
      _raw_amount::numeric,
      COALESCE(NULLIF(btrim(_fee ->> 'fee_type'), ''), 'mandatory'),
      NULLIF(btrim(_fee ->> 'description'), '')
    );
  END LOOP;

  FOR _rule IN SELECT value FROM jsonb_array_elements(COALESCE(_house_rules, '[]'::jsonb)) AS value LOOP
    IF COALESCE(btrim(_rule ->> 'title'), '') = '' THEN
      CONTINUE;
    END IF;

    _rule_index := _rule_index + 1;

    INSERT INTO public.house_rules (
      group_id,
      created_by,
      title,
      description,
      sort_order
    )
    VALUES (
      _group_id,
      _user_id,
      btrim(_rule ->> 'title'),
      NULLIF(btrim(_rule ->> 'description'), ''),
      _rule_index
    );
  END LOOP;

  UPDATE public.profiles
  SET onboarding_completed = true
  WHERE id = _user_id;

  INSERT INTO public.onboarding_operation_locks (user_id, operation_id, group_id)
  VALUES (_user_id, _operation_id, _group_id);

  PERFORM public.create_audit_log(
    _group_id,
    _user_id,
    'complete_onboarding',
    'group',
    _group_id,
    jsonb_build_object('operation_id', _operation_id)
  );

  RETURN jsonb_build_object('group_id', _group_id, 'idempotent_replay', false);

EXCEPTION
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'VALIDATION: formato inválido em valores numéricos' USING ERRCODE = '22023';
  WHEN unique_violation THEN
    RAISE EXCEPTION 'CONFLICT: operação em conflito, revise os dados e tente novamente' USING ERRCODE = '23505';
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_onboarding_with_group_setup(
  text,
  text,
  text,
  splitting_rule,
  integer,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  jsonb,
  jsonb,
  jsonb
) TO authenticated;
