CREATE OR REPLACE FUNCTION is_member_of_group(
    _user_id UUID,
    _group_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.group_members
        WHERE group_id = _group_id AND user_id = _user_id AND active = true
    );
END;
$$ LANGUAGE plpgsql;