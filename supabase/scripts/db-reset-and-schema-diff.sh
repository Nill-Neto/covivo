#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/supabase/tmp/schema-diff"
LOCAL_SCHEMA="$ARTIFACT_DIR/local_schema.sql"
PROD_SCHEMA="$ARTIFACT_DIR/production_schema.sql"
DIFF_FILE="$ARTIFACT_DIR/schema.diff"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Erro: Supabase CLI não encontrado no PATH." >&2
  exit 1
fi

if [[ -z "${PRODUCTION_DB_URL:-}" ]]; then
  echo "Erro: defina PRODUCTION_DB_URL para comparar com produção." >&2
  exit 1
fi

mkdir -p "$ARTIFACT_DIR"

echo "[1/4] Reset local completo (db reset)..."
supabase db reset --local --yes

echo "[2/4] Exportando schema local pós-reset..."
supabase db dump --local --schema public --file "$LOCAL_SCHEMA"

echo "[3/4] Exportando schema de produção..."
supabase db dump --db-url "$PRODUCTION_DB_URL" --schema public --file "$PROD_SCHEMA"

echo "[4/4] Gerando diff de schemas..."
if diff -u "$PROD_SCHEMA" "$LOCAL_SCHEMA" > "$DIFF_FILE"; then
  echo "✅ Schema local e produção estão equivalentes."
  echo "Diff salvo em: $DIFF_FILE (vazio)."
else
  echo "⚠️ Diferenças encontradas entre schema local e produção."
  echo "Revise: $DIFF_FILE"
  exit 2
fi
