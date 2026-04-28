-- This function is a compatibility wrapper that creates ambiguity with the main
-- create_expense_with_splits function that accepts _participant_user_ids.
-- Removing it to resolve function overloading issues in PostgreSQL.
DROP FUNCTION IF EXISTS public.create_expense_with_splits(uuid, text, text, numeric, text, text, date, text, uuid, uuid, text, uuid, integer, date);