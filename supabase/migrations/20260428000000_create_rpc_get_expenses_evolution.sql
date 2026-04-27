CREATE OR REPLACE FUNCTION public.get_expenses_evolution(
  _group_id uuid,
  _start_key text,
  _end_key text
)
RETURNS TABLE(
  competence_key text,
  total_casa numeric,
  meu_rateio numeric,
  meus_gastos_individuais numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  -- Security check: Ensure user is a member of the group
  IF NOT public.is_member_of_group(_user_id, _group_id) THEN
    RAISE EXCEPTION 'User is not a member of the group';
  END IF;

  RETURN QUERY
  WITH competence_series AS (
    SELECT to_char(d, 'YYYY-MM') AS key
    FROM generate_series(
      to_date(_start_key, 'YYYY-MM'),
      to_date(_end_key, 'YYYY-MM'),
      '1 month'::interval
    ) AS d
  )
  SELECT
    cs.key AS competence_key,
    -- Total Casa
    (SELECT COALESCE(SUM(amount), 0)
     FROM public.expenses
     WHERE group_id = _group_id
       AND expense_type = 'collective'
       AND expenses.competence_key = cs.key) AS total_casa,
    -- Meu Rateio
    (SELECT COALESCE(SUM(s.amount), 0)
     FROM public.expense_splits s
     JOIN public.expenses e ON s.expense_id = e.id
     WHERE e.group_id = _group_id
       AND s.user_id = _user_id
       AND e.expense_type = 'collective'
       AND e.competence_key = cs.key) AS meu_rateio,
    -- Meus Gastos Individuais
    (SELECT COALESCE(SUM(amount), 0)
     FROM public.expenses
     WHERE group_id = _group_id
       AND created_by = _user_id
       AND expense_type = 'individual'
       AND expenses.competence_key = cs.key) AS meus_gastos_individuais
  FROM competence_series cs;
END;
$$;