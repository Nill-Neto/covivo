SELECT 
  (SELECT count(*) FROM public.expenses WHERE competence_year IS NULL) as expenses_null,
  (SELECT count(*) FROM public.payments WHERE competence_year IS NULL) as payments_null,
  (SELECT count(*) FROM public.personal_expenses WHERE competence_year IS NULL) as personal_expenses_null,
  (SELECT count(*) FROM public.expense_installments WHERE competence_year IS NULL) as exp_inst_null,
  (SELECT count(*) FROM public.personal_expense_installments WHERE competence_year IS NULL) as pers_inst_null;
