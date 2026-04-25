CREATE OR REPLACE FUNCTION public.create_expense_with_p2p_splits(
    _group_id UUID,
    _created_by UUID,
    _title TEXT,
    _description TEXT,
    _amount NUMERIC,
    _category TEXT,
    _paid_to_provider BOOLEAN,
    _purchase_date DATE,
    _payment_method TEXT,
    _credit_card_id UUID,
    _installments INT,
    _splits JSONB
)
RETURNS UUID AS $$
DECLARE
    new_expense_id UUID;
    split RECORD;
    split_status TEXT;
BEGIN
    -- Set the split status based on whether the bill has been paid to the provider
    IF _paid_to_provider = true THEN
        split_status := 'pending';
    ELSE
        split_status := 'provisao';
    END IF;

    -- Insert the main expense record
    INSERT INTO public.expenses (
        group_id, created_by, title, description, amount, category,
        paid_to_provider, purchase_date, payment_method, credit_card_id, installments
    ) VALUES (
        _group_id, _created_by, _title, _description, _amount, _category,
        _paid_to_provider, _purchase_date, _payment_method, _credit_card_id, _installments
    ) RETURNING id INTO new_expense_id;

    -- Loop through the provided splits and insert them
    FOR split IN SELECT * FROM jsonb_to_recordset(_splits) AS x(user_id UUID, amount NUMERIC)
    LOOP
        -- Do not create a split for the person who paid
        IF split.user_id <> _created_by THEN
            INSERT INTO public.expense_splits (
                expense_id, group_id, user_id, amount, status, credor_user_id
            ) VALUES (
                new_expense_id, _group_id, split.user_id, split.amount, split_status, _created_by
            );
        END IF;
    END LOOP;

    RETURN new_expense_id;
END;
$$ LANGUAGE plpgsql;