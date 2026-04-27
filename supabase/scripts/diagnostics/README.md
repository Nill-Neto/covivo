# Scripts de diagnóstico extraídos das migrations versionadas

Este diretório concentra scripts SQL de inspeção/debug que **não devem** rodar no fluxo de migração de schema.

## Origem auditada
Arquivos históricos da faixa inicial de migrations, hoje renomeados para prefixo de timestamp (`20260101000019` até `20260101000129`).

## Classificação

### 1) Migrations estruturais (permanecem em `supabase/migrations/`)
- `20260101000019_make_receipts_and_documents_buckets_public.sql`
- `20260101000024_add_missing_columns_to_various_tables_to_match_codebase_types.sql`
- `20260101000025_add_competence_derivation_triggers_and_functions.sql`
- `20260101000026_add_missing_indexes_for_competence_and_groups.sql`
- `20260101000027_backfill_competence_data_for_existing_rows.sql`

### 2) Scripts de diagnóstico/inspeção (movidos para este diretório)
- `0000_check_existing_expense_installments.sql`
- `0001_inspect_expense_installments_data.sql`
- `0002_inspect_expense_installments_data.sql`
- `0003_count_expense_installments.sql`
- `0004_list_create_expense_with_splits_signatures.sql`
- `0005_list_create_expense_with_splits_signatures.sql`
- `0006_inspect_expenses_columns.sql`
- `0007_inspect_expenses_group_id.sql`
- `0008_fetch_function_definition.sql`
- `0009_fetch_function_definition.sql`
- `0010_get_credit_card_id_sample.sql`
- `0011_inspect_credit_cards.sql`
- `0012_count_credit_cards.sql`
- `0013_count_expense_installments.sql`
- `0014_list_function_signatures_again.sql`
- `0015_recent_expenses.sql`
- `0016_recent_expenses.sql`
- `0017_list_groups.sql`
- `0018_check_if_receipts_bucket_exists.sql`
- `0020_check_bucket_public_status_again.sql`
- `0021_check_storage_policies.sql`
- `0022_run_test_script.sql`
- `0023_we_can_t_run_scripts_directly_with_sql_let_me_use_the_vite_plugin_to_do_it.sql`
- `0028_verify_if_any_records_still_have_null_competence_data.sql`
- `0029_wandering_lynx_chase.sql`

## Observações
- Todos os scripts estruturais remanescentes foram endurecidos para execução idempotente e com validação explícita de dependências (`to_regclass`/`to_regprocedure`).
- Com isso, execução em banco limpo não quebra por objeto inexistente nesses arquivos.
