# Regras de dados financeiros

## Padrão de competência

Padrão único para consultas mensais por competência:

- Campo de ano: `competence_year`
- Campo de mês: `competence_month`

Sempre prefira esse par para filtros, agregações e índices de competência.

## Mapeamento por entidade

- `expenses`: usar `competence_year` + `competence_month`.
- `personal_expenses`: usar `competence_year` + `competence_month`.
- `payments`: usar `competence_year` + `competence_month`.
- `expense_installments`: usar `competence_year` + `competence_month`.
- `personal_expense_installments`: usar `competence_year` + `competence_month`.

## Compatibilidade legada (parcelas)

As tabelas de parcelas mantêm `bill_year` e `bill_month` por compatibilidade retroativa.

- `expense_installments`: `bill_year`/`bill_month` continuam legíveis e graváveis.
- `personal_expense_installments`: `bill_year`/`bill_month` continuam legíveis e graváveis.

No banco, ambos os pares são sincronizados por trigger de compatibilização. Em caso de envio dos dois pares com valores divergentes, a operação falha para preservar consistência.
