# Plano de Implementação — Hardening e Evolução do Produto

## Objetivo
Transformar os principais pontos de fragilidade identificados em melhorias com impacto real em **confiabilidade**, **consistência de negócio** e **operabilidade**, sem travar o roadmap funcional.

## Escopo (frentes principais)
1. Convites (consistência de domínio + robustez de envio)
2. Onboarding transacional (integridade de dados)
3. Unificação da lógica de ciclo financeiro (evitar divergência)
4. Evolução de relatórios (período parametrizável)
5. Fortalecimento de tipagem e contratos
6. Ajustes de UX de navegação/sidebar
7. Operação segura de Edge Functions (notificações)

---

## Fase 0 — Preparação (1 dia)

### Tarefas
- Criar branch de trabalho por frente crítica (ou feature flags se necessário).
- Definir checklist de rollout por ambiente (dev/staging/prod).
- Instrumentar logs mínimos para fluxos críticos (convite, onboarding, relatório).

### Entregáveis
- Documento de rollout/checklist operacional.
- Mapa de métricas por fluxo (taxa de sucesso e falha).

### Critério de aceite
- Time consegue responder: “está funcionando?” com métricas, não só feeling.

---

## Fase 1 — Convites confiáveis (2–3 dias)

### Problemas alvo
- URL de convite inconsistente entre frontend e Edge Function.
- Sistema sinaliza sucesso mesmo quando envio de e-mail falha.

### Implementação
1. **Fonte única de URL pública**
   - Definir variável única (`APP_PUBLIC_URL`) válida em frontend e função de envio.
   - Remover hardcode de domínio no envio de e-mail.

2. **Fluxo de envio com status real**
   - Persistir `email_delivery_status` no convite (`queued/sent/failed`) + `email_error` opcional.
   - Atualizar UI para refletir estado real (incluindo fallback “link copiado”).

3. **Reenvio/retry operacional**
   - Botão “reenviar e-mail” para convites pendentes com falha.
   - Log estruturado com `invite_id` para rastreabilidade.

### Critério de aceite
- Nenhum convite mostra “enviado por e-mail” sem retorno 2xx do provedor.
- Link gerado sempre aponta para o domínio correto do ambiente.

### Riscos
- Mudança de schema (migração) e compatibilidade com convites antigos.

---

## Fase 2 — Onboarding transacional (3–4 dias)

### Problema alvo
- Processo multi-etapas persiste parcialmente em caso de falha intermediária.

### Implementação
1. Criar RPC única (ex.: `complete_onboarding_with_group_setup`) que encapsule:
   - criação de grupo,
   - update de configuração de grupo,
   - configuração de participação do admin,
   - inserção de recorrências,
   - inserção de taxas,
   - inserção de regras,
   - marcação de onboarding concluído.

2. Garantir atomicidade (transação única no banco).
3. Garantir idempotência por `operation_id` (UUID) para evitar duplicações por retry.
4. Frontend passa a chamar RPC única e tratar erro consolidado.

### Critério de aceite
- Falha em qualquer etapa não deixa dados parciais persistidos.
- Repetir a mesma operação (mesmo `operation_id`) não duplica registros.

### Riscos
- Reescrita de parte do fluxo de onboarding e testes de regressão mais amplos.

---

## Fase 3 — Regra de ciclo única (2 dias)

### Problema alvo
- Cálculo de ciclo (fechamento/vencimento/atraso) duplicado em mais de um ponto.

### Implementação
1. Definir módulo único de domínio para ciclo (hook + util puro testável).
2. Migrar Dashboard e demais telas para usar a mesma fonte.
3. Cobrir casos de borda:
   - dia igual ao fechamento,
   - meses com menos dias,
   - virada de ano,
   - timezone local.

### Critério de aceite
- Mesmos inputs geram mesmo ciclo em todas as telas.
- Testes automatizados cobrindo bordas de data.

---

## Fase 4 — Relatórios com período selecionável (2–3 dias)

### Problema alvo
- Relatório preso ao mês corrente.

### Implementação
1. Frontend: adicionar seletor de período (competência mensal inicial; opcional faixa customizada).
2. Backend: `generate-report` recebe `start_date`/`end_date` validados.
3. Autorização: validar membership do solicitante para `group_id`.
4. Nome de arquivo padronizado por período.

### Critério de aceite
- Usuário consegue baixar PDF/CSV de meses anteriores com consistência dos dados.

### Riscos
- Performance em períodos longos (mitigar com limites de range).

---

## Fase 5 — Tipagem e contratos (2 dias, paralelo)

### Problema alvo
- Uso residual de `any`/casts em pontos críticos.

### Implementação
1. Substituir `any` por tipos derivados dos contratos Supabase.
2. Tipar respostas de RPC críticas (`accept_invite`, `remove_group_member`, etc.).
3. Ativar regra de lint para bloquear novos `any` não justificados.

### Critério de aceite
- Redução mensurável de `any` nos módulos de domínio crítico.

---

## Fase 6 — UX de navegação (1–2 dias)

### Problema alvo
- Sidebar com comportamento agressivo de abre/fecha em resize/hover.

### Implementação
1. Separar comportamento desktop/mobile explicitamente.
2. Evitar reset total de estado em todo `mediaQuery change`.
3. Definir política de abertura:
   - mobile: controle por toggle + backdrop,
   - desktop: persistência por preferência (opcional).

### Critério de aceite
- Navegação previsível em desktop e mobile, sem “menu nervoso”.

---

## Fase 7 — Operação de notificações (1 dia)

### Problema alvo
- Acoplamento de autenticação da função de notificações ao service key em header.

### Implementação
1. Definir secret dedicado para scheduler (não reutilizar service role como token externo).
2. Validar assinatura/secret de chamada de cron.
3. Manter service role apenas para cliente interno da função.

### Critério de aceite
- Chamada automatizada segura e passível de rotação sem impacto amplo.

---

## Estratégia de testes e validação

## Automatizados
- Unitários para utilitários de ciclo.
- Integração para RPC transacional de onboarding.
- Testes de contrato para respostas das funções de convite/relatório.

## Manuais (smoke)
- Fluxo completo: criar convite -> receber e-mail -> aceitar -> onboarding -> dashboard.
- Falha simulada de provedor de e-mail e comportamento da UI.
- Geração de relatório para mês atual e mês anterior.

## Métricas de sucesso (SLO prático)
- Convites com status inconsistente: **0%**.
- Onboarding com estado parcial: **0 incidentes** após release.
- Erros de relatório por período inválido: queda > **80%**.
- Redução de `any` em módulos críticos: alvo **>70%**.

---

## Sequência recomendada de execução
1. Fase 1 (Convites)
2. Fase 2 (Onboarding transacional)
3. Fase 3 (Ciclo único)
4. Fase 4 (Relatórios por período)
5. Fase 5 (Tipagem)
6. Fase 6 (Sidebar UX)
7. Fase 7 (Notificações/segurança operacional)

> Fases 5 e 6 podem rodar em paralelo com 3/4 se o time tiver duas frentes.

---

## Planejamento de calendário (estimativa)
- **Semana 1:** Fases 0, 1 e início da 2.
- **Semana 2:** concluir 2, executar 3 e 4.
- **Semana 3 (polimento):** 5, 6, 7 + estabilização.

Tempo total estimado: **10 a 15 dias úteis** (dependendo da profundidade de testes e disponibilidade de backend/frontend em paralelo).
