# Mapeamento de uso de `any` (escopo: `src/pages` e `src/contexts`)

Levantamento executado com:

```bash
rg -n "\\bany\\b" src/pages src/contexts
```

Contagem por arquivo (ordem decrescente):

- `src/pages/Dashboard.tsx`: 34
- `src/pages/Expenses.tsx`: 28
- `src/pages/Payments.tsx`: 12
- `src/pages/RecurringExpenses.tsx`: 9
- `src/pages/Members.tsx`: 9
- `src/pages/GroupSettings.tsx`: 4
- `src/pages/Admin.tsx`: 3
- `src/pages/Profile.tsx`: 1
- `src/pages/Polls.tsx`: 1
- `src/pages/Onboarding.tsx`: 1
- `src/pages/NewGroup.tsx`: 1
- `src/pages/HouseRules.tsx`: 1
- `src/pages/Bulletin.tsx`: 1
- `src/pages/AcceptInvite.tsx`: 1
- `src/contexts`: 0

> Nota: esta baseline foi registrada antes dos ajustes de tipagem incluídos neste commit.
