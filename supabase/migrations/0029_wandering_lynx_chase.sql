SELECT id, title, expense_type, competence_key, purchase_date, amount 
FROM expenses 
WHERE expense_type = 'collective' 
LIMIT 10;