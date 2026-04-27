-- Overwrite the v2 function to be extremely simple for diagnostics
CREATE OR REPLACE FUNCTION get_admin_dashboard_data_v2(
    _group_id UUID,
    _competence_key TEXT
)
RETURNS JSON AS $$
BEGIN
    -- Return a hardcoded, empty object to prove the function is being called
    -- and to eliminate any possibility of recursion within this function.
    RETURN '{
        "members": [],
        "pendingPaymentsCount": 0,
        "exMembersDebt": 0,
        "departuresCount": 0,
        "redistributedCount": 0,
        "lowStockCount": 0,
        "cycleSplits": [],
        "pendingSplits": [],
        "memberPaymentsByCompetence": {},
        "nonCriticalWarnings": []
    }';
END;
$$ LANGUAGE plpgsql;