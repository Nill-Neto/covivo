CREATE OR REPLACE FUNCTION public.simplify_group_debts(_group_id UUID)
RETURNS SETOF simplified_payment AS $$
BEGIN
    -- Placeholder implementation. A ser substituído pelo algoritmo real.
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, 0.0;
END;
$$ LANGUAGE plpgsql;