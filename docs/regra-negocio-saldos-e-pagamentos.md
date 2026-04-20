# Regra de negócio — saldos e pagamentos por competência

Documento curto para padronizar cálculo de saldo, baixa de pagamentos e nomenclatura na UI.

## 1) Conceitos obrigatórios
- **Débito anterior acumulado**: soma do que ficou em aberto em competências anteriores à competência analisada.
- **Débito da competência**: valor devido apenas na competência atual (novas despesas/splits desta competência).
- **Total devedor acumulado até a competência**: `débito anterior acumulado + débito da competência - créditos já aproveitados`.
- **Crédito por pagamento excedente**: valor pago acima do total devido no momento; vira saldo credor para abater competências futuras.

## 2) Ordem de baixa de pagamentos (FIFO)
- Todo pagamento deve ser aplicado no modelo **FIFO** (mais antigo primeiro).
- Regra operacional:
  1. quita saldo em aberto da competência mais antiga;
  2. se sobrar valor, avança para a próxima competência em aberto;
  3. se não houver débito, sobra vira **crédito por pagamento excedente**.

## 3) Arredondamento e tolerância numérica
- Todos os cálculos monetários devem usar precisão de centavos (2 casas).
- Arredondamento padrão: **half-up** na persistência/exibição final.
- Comparações de igualdade monetária devem usar tolerância `epsilon = R$ 0,01`.
- Qualquer resíduo absoluto `< R$ 0,01` deve ser normalizado para `R$ 0,00`.

## 4) Status e transições (splits/pagamentos)
- **Split**
  - `PENDING`: possui saldo devedor > 0.
  - `PARTIAL`: recebeu pagamento, mas ainda possui saldo > 0.
  - `SETTLED`: saldo devedor = 0 dentro da tolerância.
- **Pagamento**
  - `POSTED`: registrado e elegível para baixa FIFO.
  - `ALLOCATED`: valor já distribuído (total ou parcial) em débitos.
  - `REVERSED`: estornado; baixa deve ser desfeita em ordem inversa de alocação.
- Transições válidas:
  - split: `PENDING -> PARTIAL -> SETTLED` (ou `PENDING -> SETTLED`), e pode voltar para `PARTIAL/PENDING` em reabertura.
  - pagamento: `POSTED -> ALLOCATED` e `ALLOCATED -> REVERSED`.

## 5) Casos de borda
- **Pagamento parcial**: mantém débito remanescente na competência alvo e status `PARTIAL`.
- **Pagamento acima do devido**: quita todos os débitos disponíveis por FIFO e excedente vira crédito.
- **Reabertura/edição de despesa antiga**:
  1. recalcular cadeia de competências a partir da competência editada;
  2. reaplicar pagamentos em FIFO;
  3. atualizar novamente saldo acumulado, crédito e status.

## 6) Convenção de nomenclatura para UI
- Usar sempre rótulos distintos:
  - **Competência (mês/ano)**: recorte temporal atual.
  - **Acumulado até a competência**: inclui histórico anterior + competência atual.
- Evitar abreviações ambíguas como apenas “saldo” ou “total” sem contexto.
- Sugestão de labels:
  - `Débito anterior acumulado`
  - `Débito da competência`
  - `Total devedor acumulado até a competência`
  - `Crédito disponível (pagamento excedente)`

## 7) Checklist de validação manual (QA)

> Objetivo: garantir consistência do cálculo de acumulado, aplicação FIFO de pagamentos e paridade de exibição entre telas e modais.

### Pré-condições recomendadas
- Usar um grupo de teste com pelo menos 2 membros.
- Garantir que o membro validado possua permissões para ver:
  - cards de **Admin**;
  - cards de **Personal**;
  - modais de **PaymentDialogs**.
- Zerar dados de teste prévios ou usar um período isolado para evitar interferência.

### Cenário 1 — Março devendo 50 + Abril com 500 = Abril acumulado 550
1. Lançar despesas/splits em **março** que resultem em `R$ 50,00` pendente.
2. Sem quitar março, lançar despesas/splits de **abril** totalizando `R$ 500,00`.
3. Abrir visão de abril no dashboard.
4. Validar que o “total devedor acumulado até a competência” em abril seja `R$ 550,00`.
5. Confirmar que a decomposição respeita:
   - Débito anterior acumulado = `R$ 50,00`;
   - Débito da competência = `R$ 500,00`.

**Resultado esperado:** abril deve exibir acumulado `R$ 550,00`.

### Cenário 2 — Pagamento parcial em abril reduz primeiro passivo anterior
1. Partindo do cenário anterior (`R$ 50,00` março + `R$ 500,00` abril), registrar pagamento de `R$ 30,00` em abril.
2. Verificar composição do saldo após pagamento.
3. Confirmar que a baixa foi aplicada em FIFO:
   - março reduz de `R$ 50,00` para `R$ 20,00`;
   - abril permanece `R$ 500,00` (sem redução enquanto houver débito anterior).
4. Validar acumulado em abril = `R$ 520,00`.

**Resultado esperado:** pagamento parcial abate primeiro o passivo mais antigo.

### Cenário 3 — Pagamento excedente gera crédito e aparece no acumulado
1. Com saldo total conhecido (ex.: `R$ 520,00`), registrar pagamento de valor maior (ex.: `R$ 600,00`).
2. Confirmar que todos os débitos pendentes são quitados.
3. Validar criação de crédito por excedente (`R$ 80,00` no exemplo).
4. Navegar para competência seguinte e conferir que o crédito aparece como abatimento no acumulado.
5. Confirmar que não restou débito oculto em competências anteriores.

**Resultado esperado:** excedente vira crédito e é refletido corretamente no acumulado posterior.

### Cenário 4 — Paridade de totais entre Admin, Personal e PaymentDialogs
1. Com um conjunto de débitos/pagamentos ativo, capturar os totais exibidos em:
   - card da aba **Admin**;
   - card da aba **Personal**;
   - modal(s) de **PaymentDialogs** (resumo/confirmar pagamento).
2. Comparar os mesmos indicadores (acumulado, débito anterior, débito atual, crédito disponível).
3. Repetir após registrar um novo pagamento (parcial ou excedente).

**Resultado esperado:** os três pontos de UI exibem os mesmos totais para a mesma competência e mesmo membro.

### Cenário 5 — Alterar despesa antiga recalcula sem quebrar histórico
1. Criar cadeia histórica (ex.: março, abril e maio) com pagamentos já lançados.
2. Editar uma despesa de março (valor ou participantes).
3. Verificar recálculo das competências seguintes.
4. Confirmar reaplicação FIFO dos pagamentos após recálculo.
5. Validar que:
   - histórico permanece íntegro (sem duplicações/saltos);
   - saldos finais batem com a nova base.

**Resultado esperado:** edição retroativa recalcula o encadeamento sem inconsistências no histórico.

### Cenário 6 — Saída e reentrada de membro preserva pendências acumuladas
1. Com membro possuindo pendências acumuladas, registrar saída do membro.
2. Conferir que o histórico anterior continua acessível para auditoria.
3. Registrar reentrada do mesmo membro.
4. Validar que as pendências acumuladas anteriores são preservadas e voltam a compor o acumulado corretamente.
5. Registrar novo débito após reentrada e confirmar soma com pendências prévias.

**Resultado esperado:** sair/reentrar não apaga nem zera indevidamente passivos acumulados.

### Critérios de aprovação (go/no-go)
- Todos os 6 cenários com resultado esperado confirmado.
- Sem divergência de totais entre cards e modais.
- Sem resíduos monetários fora da tolerância de `R$ 0,01`.
- Sem regressão visual/funcional ao alternar competências.
