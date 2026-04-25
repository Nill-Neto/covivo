CREATE OR REPLACE FUNCTION public.get_my_p2p_balances(_user_id uuid)
 RETURNS TABLE(other_user_id uuid, other_user_full_name text, other_user_avatar_url text, net_balance numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH all_transactions AS (
        -- Credits: Money others owe me
        SELECT
            es.user_id as other_party_id,
            es.amount
        FROM
            public.expense_splits es
        WHERE
            es.credor_user_id = _user_id
            AND es.status = 'pending'

        UNION ALL

        -- Debts: Money I owe others
        SELECT
            es.credor_user_id as other_party_id,
            -es.amount -- My debts are negative amounts
        FROM
            public.expense_splits es
        WHERE
            es.user_id = _user_id
            AND es.status = 'pending'
    ),
    aggregated_balances AS (
        SELECT
            t.other_party_id,
            SUM(t.amount) as total_balance
        FROM
            all_transactions t
        GROUP BY
            t.other_party_id
    )
    SELECT
        ab.other_party_id,
        p.full_name,
        p.avatar_url,
        ab.total_balance
    FROM
        aggregated_balances ab
    JOIN
        public.profiles p ON ab.other_party_id = p.id
    WHERE
        -- Filter out zero balances
        ab.total_balance <> 0;
END;
$function$;