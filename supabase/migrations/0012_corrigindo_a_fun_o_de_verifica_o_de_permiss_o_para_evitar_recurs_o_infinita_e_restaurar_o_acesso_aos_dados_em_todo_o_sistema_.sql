CREATE OR REPLACE FUNCTION public.is_member_of_group(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.group_members
        WHERE group_id = _group_id AND user_id = _user_id AND active = true
    );
END;
$function$;