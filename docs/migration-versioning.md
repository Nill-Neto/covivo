# Convenção de versionamento de migrations (Supabase)

## Objetivo
Evitar colisões de versão e garantir execução determinística em qualquer ambiente.

## Convenção obrigatória
- **Formato de nome:** `YYYYMMDDHHMMSS_descricao_curta.sql`
- **Prefixo obrigatório:** timestamp UTC com **14 dígitos**.
- **Unicidade:** cada migration deve ter timestamp único.
- **Ordem estrita:** timestamps devem ser **estritamente crescentes** no diretório `supabase/migrations`.

## Regras de dependência lógica
Quando existir relação de dependência entre migrations, a ordem deve ser explícita no timestamp:
1. Criação/alteração de estrutura (colunas, tipos, índices base).
2. Backfill de dados.
3. Triggers/funções que dependem dos dados já normalizados.

Exemplo aplicado neste repositório:
- `20260417120000_add_payment_competence_fields.sql`
- `20260417120001_add_payment_competence_date.sql`
- `20260417140000_backfill_competence_and_enforce_not_null.sql`
- `20260417143000_set_competence_triggers_expenses_payments.sql`

## Processo recomendado para criar novas migrations
1. Gerar timestamp UTC atual (segundo).
2. Validar se já não existe arquivo com o mesmo timestamp.
3. Se houver colisão, incrementar segundos até obter valor livre.
4. Nomear com descrição curta e estável.
5. Executar validação local:
   - `node supabase/scripts/validate-migration-sequence.mjs`

## Validação de aplicação sequencial
- **Banco vazio:** validar plano completo na ordem de nome dos arquivos.
- **Banco já migrado:** validar que não há pendências no conjunto de migrations já aplicadas.

Este repositório padroniza essa checagem via `supabase/scripts/validate-migration-sequence.mjs`.
