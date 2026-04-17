-- Migration test script for enforce_credit_card_expense_rules
-- Covers:
-- 1) card closing day < group closing day
-- 2) purchase date between closings
-- 3) month/year turn behaviour

DO $$
DECLARE
  _group_id uuid := '00000000-0000-0000-0000-000000000901';
  _card_id uuid := '00000000-0000-0000-0000-000000000902';
  _actor_id uuid := '00000000-0000-0000-0000-000000000903';
  _expense_between uuid;
  _expense_after_group uuid;
  _expense_year_turn uuid;
  _purchase_date date;
  _paid_to_provider boolean;
  _competence_key text;
BEGIN
  DELETE FROM public.expenses
  WHERE id IN (
    '00000000-0000-0000-0000-000000000911',
    '00000000-0000-0000-0000-000000000912',
    '00000000-0000-0000-0000-000000000913'
  );

  DELETE FROM public.credit_cards WHERE id = _card_id;
  DELETE FROM public.groups WHERE id = _group_id;

  INSERT INTO public.groups (id, name, closing_day, due_day)
  VALUES (_group_id, 'Teste Trigger Competência Cartão', 20, 5);

  INSERT INTO public.credit_cards (id, user_id, label, brand, closing_day, due_day)
  VALUES (_card_id, _actor_id, 'Cartão Teste Trigger', 'visa', 10, 5);

  INSERT INTO public.expenses (
    id,
    group_id,
    created_by,
    title,
    amount,
    category,
    expense_type,
    payment_method,
    credit_card_id,
    installments,
    purchase_date
  )
  VALUES (
    '00000000-0000-0000-0000-000000000911',
    _group_id,
    _actor_id,
    'Teste compra entre fechamentos',
    100,
    'other',
    'collective',
    'credit_card',
    _card_id,
    1,
    '2026-08-15'
  )
  RETURNING id INTO _expense_between;

  SELECT purchase_date, paid_to_provider
    INTO _purchase_date, _paid_to_provider
  FROM public.expenses
  WHERE id = _expense_between;

  IF _purchase_date <> DATE '2026-08-20' THEN
    RAISE EXCEPTION 'FAILED test purchase between closings: expected 2026-08-20, got %', _purchase_date;
  END IF;

  IF _paid_to_provider IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FAILED provider flag for credit card expense: expected true, got %', _paid_to_provider;
  END IF;

  INSERT INTO public.expenses (
    id,
    group_id,
    created_by,
    title,
    amount,
    category,
    expense_type,
    payment_method,
    credit_card_id,
    installments,
    purchase_date
  )
  VALUES (
    '00000000-0000-0000-0000-000000000912',
    _group_id,
    _actor_id,
    'Teste compra após fechamento do grupo',
    110,
    'other',
    'collective',
    'credit_card',
    _card_id,
    1,
    '2026-08-25'
  )
  RETURNING id INTO _expense_after_group;

  SELECT purchase_date
    INTO _purchase_date
  FROM public.expenses
  WHERE id = _expense_after_group;

  IF _purchase_date <> DATE '2026-08-25' THEN
    RAISE EXCEPTION 'FAILED test purchase after group closing: expected 2026-08-25, got %', _purchase_date;
  END IF;

  UPDATE public.groups
  SET closing_day = 31
  WHERE id = _group_id;

  UPDATE public.credit_cards
  SET closing_day = 28
  WHERE id = _card_id;

  INSERT INTO public.expenses (
    id,
    group_id,
    created_by,
    title,
    amount,
    category,
    expense_type,
    payment_method,
    credit_card_id,
    installments,
    purchase_date
  )
  VALUES (
    '00000000-0000-0000-0000-000000000913',
    _group_id,
    _actor_id,
    'Teste virada de ano',
    120,
    'other',
    'collective',
    'credit_card',
    _card_id,
    1,
    '2026-12-30'
  )
  RETURNING id INTO _expense_year_turn;

  SELECT purchase_date, competence_key
    INTO _purchase_date, _competence_key
  FROM public.expenses
  WHERE id = _expense_year_turn;

  IF _purchase_date <> DATE '2026-12-31' THEN
    RAISE EXCEPTION 'FAILED year-turn purchase_date: expected 2026-12-31, got %', _purchase_date;
  END IF;

  IF _competence_key <> '2027-01' THEN
    RAISE EXCEPTION 'FAILED year-turn competence: expected 2027-01, got %', _competence_key;
  END IF;

  DELETE FROM public.expenses
  WHERE id IN (_expense_between, _expense_after_group, _expense_year_turn);

  DELETE FROM public.credit_cards WHERE id = _card_id;
  DELETE FROM public.groups WHERE id = _group_id;
END;
$$;
