SELECT s.user_id, SUM(s.amount) as total_owed
FROM expense_splits s
JOIN expenses e ON s.expense_id = e.id
WHERE e.group_id = '2b770f61-7747-4d72-a296-1834c2575944'
AND e.competence_key = '2026-03'
AND e.expense_type = 'collective'
GROUP BY s.user_id;