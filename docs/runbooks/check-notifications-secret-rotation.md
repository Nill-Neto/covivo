# Runbook — Rotação do segredo do cron `check-notifications`

## Objetivo
Garantir rotação segura do segredo compartilhado entre:
- cron job `check-notifications-daily`; e
- Edge Function `check-notifications`.

A arquitetura foi ajustada para usar **uma única fonte de verdade**:
`vault.decrypted_secrets` com o nome `check_notifications_scheduler_secret`.

---

## Pré-requisitos
- Acesso SQL ao projeto Supabase com permissões administrativas.
- Deploy da migration `20260425222000_unify_scheduler_secret_and_add_cron_failure_alerting.sql` aplicado.
- A Edge Function `check-notifications` implantada com a versão que chama a RPC `get_check_notifications_scheduler_secret`.

---

## Passo a passo de rotação

### 1) Gerar novo segredo forte
Use um segredo aleatório de alta entropia (mínimo 32 bytes).

Exemplo local:
```bash
openssl rand -base64 48
```

### 2) Inserir o novo segredo no Vault
No SQL Editor:
```sql
SELECT vault.create_secret('<NOVO_SEGREDO>', 'check_notifications_scheduler_secret');
```

> Observação: o runbook assume histórico versionado no Vault. A função
> `public.get_check_notifications_scheduler_secret()` sempre busca o registro mais recente por `created_at DESC`.

### 3) Regravar/agendar cron (garantia operacional)
Reaplique a migration mais recente de scheduler ou execute apenas:
```sql
SELECT cron.unschedule('check-notifications-daily');

SELECT cron.schedule(
  'check-notifications-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mqorykrxvqfkifjkveqe.supabase.co/functions/v1/check-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-scheduler-token', public.get_check_notifications_scheduler_secret()
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### 4) Verificação imediata pós-rotação
Executar chamada manual com novo segredo:
```bash
curl -i \
  -H "x-scheduler-token: <NOVO_SEGREDO>" \
  -H "Content-Type: application/json" \
  -X POST \
  https://mqorykrxvqfkifjkveqe.supabase.co/functions/v1/check-notifications \
  -d '{}'
```

Esperado: HTTP 2xx e body com `{"success":true,...}`.

### 5) Confirmar monitoramento de falhas
Verifique o job `check-notifications-failure-monitor` ativo e sem novos eventos críticos:
```sql
SELECT *
FROM cron.job
WHERE jobname IN ('check-notifications-daily', 'check-notifications-failure-monitor');

SELECT *
FROM public.cron_execution_alerts
ORDER BY detected_at DESC
LIMIT 20;
```

---

## Rollback
Se houver falha após rotação:
1. Inserir novamente o segredo anterior no Vault com o mesmo nome.
2. Reagendar o job `check-notifications-daily` (passo 3).
3. Validar com chamada manual (passo 4).

---

## Sinais de falha e ação
- **401 Unauthorized** na função: segredo enviado pelo cron difere do esperado.
- **status != 2xx** em `net._http_response`: evento registrado em `public.cron_execution_alerts`.
- **`timed_out = true`**: investigar latência da Edge Function e disponibilidade da plataforma.

Ações mínimas:
1. consultar `public.cron_execution_alerts`;
2. correlacionar com logs da Edge Function;
3. executar disparo manual autenticado para teste controlado.
