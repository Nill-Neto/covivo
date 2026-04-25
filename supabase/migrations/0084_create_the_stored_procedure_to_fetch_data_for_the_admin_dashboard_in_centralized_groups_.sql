-- Drop the function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS get_admin_dashboard_data(uuid);

-- Then, create the new version
CREATE OR REPLACE FUNCTION get_admin_dashboard_data(_group_id uuid)
RETURNS TABLE(pending_payments_count bigint, total_debt numeric, members_in_debt_count bigint)
AS $$
DECLARE
    _total_splits numeric;
    _total_payments numeric;
BEGIN
    -- 1. Pending payments count
    SELECT COUNT(*) INTO pending_payments_count
    FROM payments
    WHERE group_id = _group_id AND status = 'pending';

    -- 2. Total debt calculation
    SELECT COALESCE(SUM(es.amount), 0)
    INTO _total_splits
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    WHERE e.group_id = _group_id;

    SELECT COALESCE(SUM(p.amount), 0)
    INTO _total_payments
    FROM payments p
    WHERE p.group_id = _group_id AND p.status = 'confirmed';

    total_debt := _total_splits - _total_payments;
    IF total_debt < 0 THEN
        total_debt := 0;
    END IF;

    -- 3. Members in debt count
    WITH user_balances AS (
      SELECT
        gm.user_id,
        (
          COALESCE((
            SELECT SUM(es.amount)
            FROM expense_splits es
            JOIN expenses e ON es.expense_id = e.id
            WHERE e.group_id = _group_id AND es.user_id = gm.user_id
          ), 0)
          -
          COALESCE((
            SELECT SUM(p.amount)
            FROM payments p
            WHERE p.group_id = _group_id AND p.paid_by = gm.user_id AND p.status = 'confirmed'
          ), 0)
        ) as balance
      FROM group_members gm
      WHERE gm.group_id = _group_id AND gm.active = true
    )
    SELECT COUNT(*)
    INTO members_in_debt_count
    FROM user_balances
    WHERE balance > 0.01;

    RETURN QUERY SELECT pending_payments_count, total_debt, members_in_debt_count;
END;
$$ LANGUAGE plpgsql;