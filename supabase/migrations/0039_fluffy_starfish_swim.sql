SELECT title, competence_key, expense_type, payment_method 
FROM expenses 
WHERE group_id = '2b770f61-7747-4d72-a296-1834c2575944' 
AND competence_key = '2026-05' 
AND expense_type = 'individual' 
AND payment_method <> 'credit_card';