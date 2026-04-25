SELECT id, title, expense_type, competence_key, purchase_date, amount, group_id
FROM expenses 
WHERE title = 'Xita doces'
LIMIT 5;