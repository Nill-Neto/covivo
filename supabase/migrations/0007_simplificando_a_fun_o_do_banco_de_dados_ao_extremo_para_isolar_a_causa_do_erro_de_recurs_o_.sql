-- Overwrite the v2 function to be extremely simple, querying only group_members.
CREATE OR REPLACE FUNCTION get_admin_dashboard_data_v2(
    _group_id UUID,
    _competence_key TEXT
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'members', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'user_id', m.user_id,
                    'active', m.active,
                    'profile', null, -- Temporarily removed for diagnostics
                    'role', null,    -- Temporarily removed for diagnostics
                    'balance', 0,
                    'previous_debt', 0,
                    'current_cycle_owed', 0,
                    'current_cycle_paid', 0,
                    'accrued_debt', 0
                )
            )
            FROM group_members m
            WHERE m.group_id = _group_id AND m.active = true
        ), '[]'::json),
        'pendingPaymentsCount', 0,
        'exMembersDebt', 0,
        'departuresCount', 0,
        'redistributedCount', 0,
        'lowStockCount', 0,
        'cycleSplits', '[]'::json,
        'pendingSplits', '[]'::json,
        'memberPaymentsByCompetence', '{}'::json,
        'nonCriticalWarnings', '[]'::json
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;