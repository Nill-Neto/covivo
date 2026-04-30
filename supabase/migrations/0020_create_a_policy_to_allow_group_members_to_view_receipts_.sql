CREATE POLICY "Members can view expense receipts"
ON public.expense_receipts
FOR SELECT
TO authenticated
USING (
  is_member_of_group(auth.uid(), (SELECT group_id FROM public.expenses WHERE id = expense_id))
);