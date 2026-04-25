CREATE OR REPLACE FUNCTION public.get_group_p2p_matrix(_group_id uuid)
 RETURNS TABLE(person_a_id uuid, person_b_id uuid, net_balance_a_to_b numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH all_transactions AS (
        -- Treat all debts as directed transactions
        SELECT
            user_id as devedor_user_id,
            credor_user_id,
            amount
        FROM public.expense_splits
        WHERE group_id = _group_id AND status = 'pending'
    ),
    -- Create canonical pairs to group transactions between two people
    -- The person with the lower UUID is always person1
    canonical_pairs AS (
        SELECT
            CASE WHEN devedor_user_id::text < credor_user_id::text THEN devedor_user_id ELSE credor_user_id END as person1_id,
            CASE WHEN devedor_user_id::text < credor_user_id::text THEN credor_user_id ELSE devedor_user_id END as person2_id,
            -- If the debtor is person1, the amount is positive (p1 owes p2)
            -- If the creditor is person1, the amount is negative (p2 owes p1)
            CASE WHEN devedor_user_id::text < credor_user_id::text THEN amount ELSE -amount END as directed_amount
        FROM all_transactions
    ),
    -- Sum up all transactions for each canonical pair
    net_balances AS (
        SELECT
            person1_id,
            person2_id,
            SUM(directed_amount) as net_total
        FROM canonical_pairs
        GROUP BY person1_id, person2_id
    )
    SELECT
        nb.person1_id,
        nb.person2_id,
        nb.net_total
    FROM net_balances nb
    WHERE nb.net_total <> 0;
END;
$function$;