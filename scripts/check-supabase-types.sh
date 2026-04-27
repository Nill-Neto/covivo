#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "SUPABASE_ACCESS_TOKEN is required to check generated Supabase types." >&2
  exit 1
fi

TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

npx -y supabase@latest gen types typescript \
  --project-id mqorykrxvqfkifjkveqe \
  --schema public > "$TMP_FILE"

if ! diff -u "$TMP_FILE" src/integrations/supabase/types.ts; then
  echo "\nSupabase generated types are out of sync. Run: npm run supabase:types:generate" >&2
  exit 1
fi

echo "Supabase types are up to date."
