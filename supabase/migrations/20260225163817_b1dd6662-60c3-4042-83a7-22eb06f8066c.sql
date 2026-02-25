
-- Allow moradores to update their own individual expenses
CREATE POLICY "Creator can update own individual expenses"
ON public.expenses FOR UPDATE
USING (
  expense_type = 'individual'
  AND created_by = auth.uid()
  AND is_member_of_group(auth.uid(), group_id)
);

-- Allow moradores to delete their own individual expenses
CREATE POLICY "Creator can delete own individual expenses"
ON public.expenses FOR DELETE
USING (
  expense_type = 'individual'
  AND created_by = auth.uid()
  AND is_member_of_group(auth.uid(), group_id)
);

-- Allow moradores to update splits on their own individual expenses
CREATE POLICY "Creator can update own individual expense splits"
ON public.expense_splits FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_splits.expense_id
    AND e.expense_type = 'individual'
    AND e.created_by = auth.uid()
    AND is_member_of_group(auth.uid(), e.group_id)
  )
);

-- Allow moradores to delete splits on their own individual expenses
CREATE POLICY "Creator can delete own individual expense splits"
ON public.expense_splits FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_splits.expense_id
    AND e.expense_type = 'individual'
    AND e.created_by = auth.uid()
    AND is_member_of_group(auth.uid(), e.group_id)
  )
);
