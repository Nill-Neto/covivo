CREATE OR REPLACE FUNCTION public.create_expense_with_splits_v2(
  _group_id uuid,
  _title text,
  _description text default null,
  _amount numeric default 0,
  _category text default 'other',
  _expense_type text default 'collective',
  _due_date date default null,
  _receipt_url text default null,
  _recurring_expense_id uuid default null,
  _target_user_id uuid default null,
  _payment_method text default 'cash',
  _credit_card_id uuid default null,
  _installments integer default 1,
  _purchase_date date default null,
  _participant_user_ids uuid[] default null,
  _payer_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _expense_id uuid;
  _auth_user_id uuid := auth.uid();
  _caller_id uuid;
  _member record;
  _participant_id uuid;
  _member_count int;
  _split_amount numeric(12,2);
  _group_rule text;
  _final_purchase_date date;
  _per_installment numeric(12,2);
  _closing_day int;
  _bill_month int;
  _bill_year int;
  _bill_base date;
  _effective_participants uuid[];
  _effective_creditor_id uuid;
begin
  if _auth_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  _caller_id := _auth_user_id;
  _effective_creditor_id := coalesce(_payer_user_id, _caller_id);

  if _effective_creditor_id is null then
    raise exception 'Falha de identidade do usuário (credor)';
  end if;

  if not has_role_in_group(_caller_id, _group_id, 'admin') then
    raise exception 'Apenas administradores podem criar despesas';
  end if;

  _final_purchase_date := coalesce(_purchase_date, current_date);
  _effective_participants := coalesce(_participant_user_ids, array[]::uuid[]);

  if not has_role_in_group(_caller_id, _group_id, 'admin') and _expense_type = 'collective' then
    raise exception 'Apenas administradores podem criar despesas coletivas';
  end if;

  if _expense_type = 'collective' then
    if array_length(_effective_participants, 1) is null then
      select array_agg(gm.user_id order by gm.user_id)
      into _effective_participants
      from public.group_members gm
      where gm.group_id = _group_id
        and gm.active = true
        and gm.participates_in_splits = true;
    else
      select array_agg(gm.user_id order by gm.user_id)
      into _effective_participants
      from public.group_members gm
      where gm.group_id = _group_id
        and gm.active = true
        and gm.user_id = any(_effective_participants);
    end if;

    if array_length(_effective_participants, 1) is null then
      raise exception 'Despesa coletiva deve ter ao menos 1 participante';
    end if;
  else
    if array_length(_effective_participants, 1) is null then
      _effective_participants := array[coalesce(_target_user_id, _caller_id)];
    end if;

    if array_length(_effective_participants, 1) <> 1 then
      raise exception 'Despesa individual deve ter exatamente 1 participante';
    end if;

    if _effective_participants[1] is null then
      raise exception 'Participante da despesa individual inválido';
    end if;
  end if;

  insert into public.expenses (
    group_id, created_by, title, description, amount, category,
    expense_type, due_date, receipt_url, recurring_expense_id,
    payment_method, credit_card_id, installments, purchase_date
  ) values (
    _group_id, _caller_id, _title, _description, _amount, _category,
    _expense_type, _due_date, _receipt_url, _recurring_expense_id,
    _payment_method, _credit_card_id, _installments, _final_purchase_date
  ) returning id into _expense_id;

  if _expense_type = 'individual' then
    insert into public.expense_splits (expense_id, user_id, amount, credor_user_id, status)
    values (_expense_id, _effective_participants[1], _amount, _effective_creditor_id, 'pending');
  else
    select count(*) into _member_count
    from unnest(_effective_participants) as participant_id;

    if _member_count < 1 then
      raise exception 'Despesa coletiva deve ter ao menos 1 participante';
    end if;

    if array_length(_participant_user_ids, 1) is not null then
      _split_amount := round(_amount / _member_count, 2);
      foreach _participant_id in array _effective_participants loop
        insert into public.expense_splits (expense_id, user_id, amount, credor_user_id, status)
        values (_expense_id, _participant_id, _split_amount, _effective_creditor_id, 'pending');
      end loop;
    else
      select splitting_rule::text into _group_rule from public.groups where id = _group_id;
      if _group_rule = 'equal' then
        _split_amount := round(_amount / _member_count, 2);
        foreach _participant_id in array _effective_participants loop
          insert into public.expense_splits (expense_id, user_id, amount, credor_user_id, status)
          values (_expense_id, _participant_id, _split_amount, _effective_creditor_id, 'pending');
        end loop;
      else
        for _member in
          select gm.user_id, coalesce(gm.split_percentage, 0) as pct
          from public.group_members gm
          where gm.group_id = _group_id
            and gm.active = true
            and gm.participates_in_splits = true
            and gm.user_id = any(_effective_participants)
        loop
          _split_amount := round(_amount * _member.pct / 100, 2);
          insert into public.expense_splits (expense_id, user_id, amount, credor_user_id, status)
          values (_expense_id, _member.user_id, _split_amount, _effective_creditor_id, 'pending');
        end loop;
      end if;
    end if;
  end if;

  if _payment_method = 'credit_card' and _credit_card_id is not null and _installments > 0 then
    select closing_day into _closing_day from public.credit_cards where id = _credit_card_id;
    _bill_base := _final_purchase_date;
    if extract(day from _final_purchase_date) > _closing_day then
      _bill_base := _bill_base + interval '1 month';
    end if;
    _per_installment := round(_amount / _installments, 2);

    for i in 1.._installments loop
      _bill_month := extract(month from _bill_base + ((i-1) * interval '1 month'));
      _bill_year := extract(year from _bill_base + ((i-1) * interval '1 month'));
      insert into public.expense_installments (user_id, expense_id, installment_number, amount, bill_month, bill_year)
      values (_caller_id, _expense_id, i, _per_installment, _bill_month, _bill_year);
    end loop;
  end if;

  return _expense_id;
end;
$$;

GRANT EXECUTE ON FUNCTION public.create_expense_with_splits_v2(
  uuid, text, text, numeric, text, text, date, text, uuid, uuid, text, uuid, integer, date, uuid[], uuid
) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
