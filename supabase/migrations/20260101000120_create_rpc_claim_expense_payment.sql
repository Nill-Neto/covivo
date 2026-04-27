CREATE OR REPLACE FUNCTION public.claim_expense_payment(
    _expense_id UUID,
    _user_id UUID
)
RETURNS void AS $$
DECLARE
    _group_id UUID;
BEGIN
    -- Get the group_id from the expense
    SELECT group_id INTO _group_id
    FROM public.expenses
    WHERE id = _expense_id;

    -- Authorization: Check if the user is a member of the group
    IF NOT is_member_of_group(_user_id, _group_id) THEN
        RAISE EXCEPTION 'User is not a member of the group';
    END IF;

    -- Update the expense to mark it as paid by the user
    UPDATE public.expenses
    SET
        paid_to_provider = true,
        created_by = _user_id
    WHERE
        id = _expense_id;

    -- Update the corresponding splits to make them active debts
    UPDATE public.expense_splits
    SET
        status = 'pending',
        credor_user_id = _user_id
    WHERE
        expense_id = _expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;