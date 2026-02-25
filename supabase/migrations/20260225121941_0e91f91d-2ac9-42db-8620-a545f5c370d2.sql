
-- Fix expense_installments RLS: add group membership verification

-- Drop existing policies
DROP POLICY IF EXISTS "expense_installments_select_own" ON public.expense_installments;
DROP POLICY IF EXISTS "expense_installments_insert_own" ON public.expense_installments;
DROP POLICY IF EXISTS "expense_installments_update_own" ON public.expense_installments;
DROP POLICY IF EXISTS "expense_installments_delete_own" ON public.expense_installments;

-- SELECT: user owns + active group membership
CREATE POLICY "expense_installments_select_own" 
ON public.expense_installments FOR SELECT TO authenticated
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.expenses e
    JOIN public.group_members gm ON gm.group_id = e.group_id
    WHERE e.id = expense_installments.expense_id
    AND gm.user_id = auth.uid()
    AND gm.active = true
  )
);

-- INSERT: user owns + active group membership
CREATE POLICY "expense_installments_insert_own" 
ON public.expense_installments FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.expenses e
    JOIN public.group_members gm ON gm.group_id = e.group_id
    WHERE e.id = expense_installments.expense_id
    AND gm.user_id = auth.uid()
    AND gm.active = true
  )
);

-- UPDATE: user owns + active group membership
CREATE POLICY "expense_installments_update_own" 
ON public.expense_installments FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.expenses e
    JOIN public.group_members gm ON gm.group_id = e.group_id
    WHERE e.id = expense_installments.expense_id
    AND gm.user_id = auth.uid()
    AND gm.active = true
  )
);

-- DELETE: user owns + active group membership
CREATE POLICY "expense_installments_delete_own" 
ON public.expense_installments FOR DELETE TO authenticated
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.expenses e
    JOIN public.group_members gm ON gm.group_id = e.group_id
    WHERE e.id = expense_installments.expense_id
    AND gm.user_id = auth.uid()
    AND gm.active = true
  )
);
