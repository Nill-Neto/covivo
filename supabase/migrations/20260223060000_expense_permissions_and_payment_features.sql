-- Permitir que usuários atualizem suas próprias despesas (para despesas individuais)
CREATE POLICY "Users can update own expenses" ON public.expenses
FOR UPDATE TO authenticated
USING (created_by = auth.uid());

-- Permitir que usuários deletem suas próprias despesas
CREATE POLICY "Users can delete own expenses" ON public.expenses
FOR DELETE TO authenticated
USING (created_by = auth.uid());