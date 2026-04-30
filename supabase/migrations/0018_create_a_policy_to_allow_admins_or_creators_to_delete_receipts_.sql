CREATE POLICY "Can delete receipts if admin or creator of individual expense"
ON public.expense_receipts
FOR DELETE
TO authenticated
USING (
  (SELECT has_role_in_group(auth.uid(), group_id, 'admin'::app_role) FROM public.expenses WHERE id = expense_id)
  OR
  (SELECT expense_type = 'individual' AND created_by = auth.uid() FROM public.expenses WHERE id = expense_id)
);