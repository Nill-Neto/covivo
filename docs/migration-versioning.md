# Convenção de versionamento de migrations (Supabase)

## Objetivo
Evitar colisões de versão, remover comportamento não determinístico e garantir execução reproduzível em qualquer ambiente.

## Convenção obrigatória
- **Formato de nome:** `YYYYMMDDHHMMSS_descricao_curta.sql`
- **Prefixo obrigatório:** timestamp UTC com **14 dígitos**.
- **Unicidade:** cada migration deve ter timestamp único.
- **Ordem estrita:** timestamps devem ser **estritamente crescentes** no diretório `supabase/migrations`.

## Baseline limpo (squash controlado)
- Sempre que houver cadeia histórica longa de migrations corretivas, consolide em **uma migration baseline**.
- A consolidação deve preservar exatamente o estado final do schema (DDL + funções + índices + triggers + constraints).
- Após o squash, remova os arquivos históricos substituídos e mantenha somente o baseline consolidado no ponto cronológico correto.
- Neste repositório, a cadeia de competência histórica foi consolidada no baseline:
  - `20260101000024_add_missing_columns_to_various_tables_to_match_codebase_types.sql`

## Sequência determinística obrigatória
Toda evolução estrutural crítica deve seguir esta ordem:
1. **Criação** (tabelas/colunas/objetos-base)
2. **Alteração** (funções, normalizações, ajustes de semântica)
3. **Backfill** (preenchimento de dados legados)
4. **Constraints / índices / triggers finais** (enforcement)

## Proibição de “skip se tabela não existe” em mudanças críticas
- Mudanças estruturais críticas **não podem** depender de `to_regclass` para “pular” execução silenciosamente.
- Não usar `RAISE NOTICE 'Skipping ...'` para esconder falta de pré-condições em migrations de schema.
- Se dependência estrutural estiver ausente, a migration deve falhar explicitamente.

## Processo recomendado para criar novas migrations
1. Gerar timestamp UTC atual (segundo).
2. Validar se já não existe arquivo com o mesmo timestamp.
3. Se houver colisão, incrementar segundos até obter valor livre.
4. Nomear com descrição curta e estável.
5. Executar validação local:
   - `npm run supabase:migrations:validate`

## Teste obrigatório de reset + diff com produção
Antes de promover mudanças estruturais:
1. Rodar reset completo local:
   - `supabase db reset --local --yes`
2. Comparar schema final local vs produção por diff automatizado:
   - `PRODUCTION_DB_URL=postgresql://... npm run supabase:db:reset:diff`

A automação acima está em `supabase/scripts/db-reset-and-schema-diff.sh`.
