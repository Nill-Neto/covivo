# Regras de competência por domínio

Este documento define **qual campo é a fonte de verdade da competência** em cada entidade.

## 1) Despesas à vista / cartão sem parcelamento
- Campo de competência: `expenses.purchase_date`.
- Observação: quando houver ajuste explícito no backend (ex.: regra de fechamento de cartão x grupo), o valor final persistido em `purchase_date` é o que vale.

## 2) Parcelas
- Campo de competência: `expense_installments.bill_month` + `expense_installments.bill_year`.
- Observação: esse modelo já existe e continua sendo a referência para itens parcelados.

## 3) Pagamentos
- Campo de competência: `payments.competence_date` (**novo campo explícito**).
- Observação: `created_at` não define competência; serve apenas para auditoria (momento de criação).

## Diretriz geral
- Frontend deve consultar/filtrar por campos de competência do domínio.
- Cálculo/normalização de competência deve acontecer no backend.
