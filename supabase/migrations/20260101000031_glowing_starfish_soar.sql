SELECT id, title, expense_type, competence_key, purchase_date, amount 
FROM expenses 
WHERE expense_type = 'collective' 
AND purchase_date >= '2026-04-09'
AND purchase_date <= '2026-04-17';