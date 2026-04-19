# Auditoria React + TypeScript (12 pontos)

Data: 2026-04-19  
Escopo: `src/**` e testes/lint do projeto

## Resumo executivo

- O projeto está com **lint sem erros** (apenas 15 warnings), mas ainda com risco técnico relevante em `any` espalhado em páginas críticas e componentes de dashboard.  
- Há oportunidade forte de **reduzir acoplamento e prop drilling** no `Dashboard`, além de quebrar componentes/páginas grandes (vários arquivos acima de 500 linhas).  
- A suíte de testes falha hoje em um ponto crítico de execução (`previousDebtFallback is not defined` no `AdminTab`), o que reduz confiabilidade para mudanças rápidas.

## Comandos executados

```bash
npm run lint
npm test -- --run
find src -type f \( -name '*.tsx' -o -name '*.ts' \) -print0 | xargs -0 wc -l | sort -nr | head -n 20
rg -n "\\bany\\b|@ts-nocheck" src supabase/functions
rg -n "SidebarDemoPage|BackgroundPathsDemoPage|demo" src/App.tsx src/pages src/components
rg -n "size=\\\"icon\\\"" src/pages src/components
rg -n "ErrorBoundary|componentDidCatch|getDerivedStateFromError" src
npx ts-prune -p tsconfig.app.json
```

---

## 1) DRY (evitar duplicação)

### Achados
- Navegação de mês (botões anterior/próximo) repetida em múltiplas telas (`Expenses`, `Payments`, `Inventory`) e também no header do dashboard, com padrão visual/comportamental semelhante. 
- Padrões de ação destrutiva com botão ícone + confirmação aparecem repetidamente em `Expenses`, `RecurringExpenses`, `Payments`, `Bulletin`, `HouseRules` e `ShoppingLists`.

### Sugestões
- Extrair um componente reutilizável `MonthNavigator` (ex.: `currentDate`, `onPrev`, `onNext`, `label`).
- Padronizar confirmação destrutiva em um `ConfirmActionDialog` com API única e textos default.
- Centralizar toasts de erro/sucesso em helper (`mapMutationResultToToast`) para reduzir repetição de `onError` inline.

## 2) Eliminar código morto (dead code)

### Achados
- Existem rotas e componentes de demo (`/sidebar-demo`, `/background-paths-demo`) carregados no `App`, úteis para playground, mas potencialmente desnecessários em build de produção.
- Não há evidência imediata de componentes órfãos só por leitura estática; para isso, seria ideal uma análise de exports não usados.
- A tentativa de rodar `ts-prune` falhou por bloqueio do registry (403), então o mapeamento automático de exports mortos ficou incompleto.

### Sugestões
- Proteger demos por flag de ambiente (`import.meta.env.DEV`) ou remover do roteamento principal.
- Rodar `ts-prune`/`knip` no CI com mirror autorizado para identificar exports não usados de forma contínua.

## 3) Uso consistente de TypeScript

### Achados
- Há uso extenso de `any` em páginas centrais (`Dashboard`, `Expenses`, `Payments`, `Admin`, `GroupSettings`, etc.).
- Também há `any` em props de componentes de dashboard (`PersonalTab`, `CardsTab`) e em componentes de UI (`donut-chart`, `sidebar`, `scroll-reveal`).
- O problema principal de tipagem não é sintaxe de TS, e sim **fronteiras de dados sem contrato explícito**.

### Sugestões
- Priorizar tipagem por impacto: `Dashboard`, `Expenses`, `Payments`, `AdminTab`.
- Criar tipos de view-model por feature (`DashboardPendingItem`, `InstallmentView`, etc.) em vez de arrays `any[]`.
- Substituir casts `as any` no acesso Supabase por tipos derivados de `src/integrations/supabase/types.ts`.

## 4) Componentes bem estruturados

### Achados
- Arquivos muito grandes e multi-responsabilidade:
  - `src/pages/Expenses.tsx` (1508 linhas)
  - `src/pages/GroupSettings.tsx` (864)
  - `src/components/dashboard/PersonalTab.tsx` (727)
  - `src/components/dashboard/AdminTab.tsx` (705)
  - `src/pages/Payments.tsx` (683)
  - `src/components/dashboard/CardsTab.tsx` (677)
  - `src/pages/Dashboard.tsx` (580)
- Esses módulos misturam consulta de dados, transformação de domínio, estado local e renderização extensa.

### Sugestões
- Quebrar por responsabilidade: `container + view + hooks + selectors` por feature.
- Criar limite interno (ex.: 250-300 linhas) para iniciar refatoração obrigatória em PR.

## 5) Gestão de estado eficiente

### Achados
- `Dashboard` concentra muito estado e repassa muitas props para `PersonalTab`, `CardsTab` e `PaymentDialogs`, caracterizando prop drilling.
- Parte do estado é derivado de outras estruturas e poderia ser calculado por selectors memoizados fora do componente.

### Sugestões
- Introduzir contexto local de feature (ex.: `DashboardPaymentsContext`) só para estado compartilhado entre tabs/dialogs.
- Migrar cálculos derivados para hooks utilitários (`useDashboardTotals`, `useCollectivePending`) para simplificar árvore de props.

## 6) Uso adequado de hooks

### Achados
- `eslint` acusa dependências de hooks inconsistentes (`AuthContext`, `AcceptInvite`, `Dashboard`, `AdminTab`).
- Warnings incluem dependência faltante e dependências instáveis em `useMemo`.

### Sugestões
- Revisar `useEffect/useMemo` com foco em estabilidade de referências (`useCallback`/memo de coleções).
- Extrair lógicas densas de hook para custom hooks com contratos claros e testes isolados.

## 7) Separação lógica x apresentação

### Achados
- Páginas como `Dashboard`, `Expenses`, `Payments` embutem regras de negócio e chamadas Supabase junto com JSX.
- Em `Dashboard`, há transformação de dados e regras de aplicação de pagamentos no mesmo arquivo de renderização.

### Sugestões
- Criar camada `features/*/api.ts` e `features/*/selectors.ts`.
- Deixar componentes visuais recebendo dados já normalizados (presentational-first).

## 8) Tratamento de erros

### Achados
- Há tratamento parcial com toasts, porém ainda com `console.error` em chamadas assíncronas.
- Não foi identificado Error Boundary global na aplicação.
- Falha em teste mostra risco de erro de runtime sem fallback de UI (`previousDebtFallback is not defined`).

### Sugestões
- Adicionar `AppErrorBoundary` no shell de rotas.
- Padronizar normalização de erro (`normalizeAppError`) e evitar mensagens técnicas diretas ao usuário.
- Para queries críticas, exibir estados explícitos de erro + ação de retry.

## 9) Performance e otimizações

### Achados
- `Dashboard` e outras páginas grandes fazem muitas transformações em tempo de render.
- Há funções e objetos derivados recriados a cada render (inclusive apontado por warnings de `useMemo`).
- Listas potencialmente extensas (despesas, pagamentos, convites, inventário) são renderizadas sem virtualização.

### Sugestões
- Movimentar transformações pesadas para `useMemo` estáveis e selectors puros.
- Usar `React.memo` em cards/itens de lista com props estáveis.
- Considerar paginação incremental ou virtualização nas listas com maior volume.

## 10) Organização de projeto

### Achados
- Estrutura atual é híbrida por camadas (`pages`, `components`, `hooks`) com domínios já complexos.
- O domínio de dashboard está espalhado entre `pages/Dashboard.tsx` e `components/dashboard/*` sem uma pasta de feature única.

### Sugestões
- Migrar gradualmente para organização por feature (ex.: `src/features/dashboard`, `src/features/expenses`).
- Manter `components/ui/*` estritamente genérico e sem regra de negócio.

## 11) Acessibilidade (a11y)

### Achados
- Há grande quantidade de botões icon-only (`size="icon"`) em várias telas.
- Parte desses botões usa apenas `title` ou não deixa claro o nome acessível em leitores de tela.

### Sugestões
- Padronizar `aria-label` obrigatório para todo botão icon-only.
- Revisar elementos clicáveis não semânticos e garantir navegação por teclado (tab/focus/enter/space).

## 12) Testes adequados

### Achados
- A suíte atual possui testes úteis, mas há falha real em `AdminTab.checklist.test.tsx` (4 cenários quebrando por `ReferenceError`).
- Persistem warnings de teste sobre `act(...)` e warnings de future flags do React Router.

### Sugestões (ordem de prioridade)
1. Corrigir imediatamente a regressão de runtime em `AdminTab` para restaurar confiança da suíte.
2. Fortalecer testes de comportamento para fluxos críticos (`Dashboard`, `Payments`, `Expenses`).
3. Criar testes unitários para selectors/hooks extraídos, reduzindo necessidade de mocks pesados em páginas gigantes.

---

## Backlog priorizado (curto prazo)

1. **Confiabilidade imediata**: corrigir `AdminTab` (`previousDebtFallback`) e eliminar warnings de hooks mais críticos.  
2. **Tipagem estratégica**: remover `any` dos fluxos de dashboard/pagamentos/despesas com view-models explícitos.  
3. **Refatoração estrutural**: decompor `Dashboard`, `Expenses`, `Payments` em módulos por responsabilidade.  
4. **A11y e UX de erro**: `aria-label` padrão + Error Boundary global + retry states.  
5. **Qualidade contínua**: incluir análise de código morto no CI quando houver acesso ao pacote (`ts-prune`/equivalente).
