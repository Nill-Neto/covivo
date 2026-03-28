# Tarefa 001 — Rebranding inicial para Covivo (revisado)

## Objetivo
Aplicar o rebranding inicial do nome do produto de **Republi-K** para **Covivo** nos pontos de maior visibilidade e comunicação externa, preservando a estrutura existente do app.

## Escopo aplicado
- Metadados e título da aplicação
- Login e landing
- Header principal (AppLayout)
- Tela de aceite de convite
- Texto e remetente do e-mail de convite (Edge Function)
- URL pública padrão da aplicação (com fallback compatível)
- Centralização do nome da marca em config compartilhada
- Migração segura da chave de grupo ativo no localStorage

## Observações
- Mudança incremental: sem rebuild da arquitetura
- Foco em branding/copy de alto impacto
- Rebranding revisado para evitar quebra operacional de convites:
  - Frontend mantém fallback de URL legado se `VITE_APP_URL` não estiver definido.
  - Edge Function passa a ler `APP_PUBLIC_URL` com fallback legado.
- LocalStorage migra de `republi-k-active-group` para `covivo-active-group` sem perda de estado.
