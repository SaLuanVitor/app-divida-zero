## [FASE-3c.2] WhatsAppDispatchJob + Real WhatsAppChannel

**Implementation:** Implementar `WhatsAppDispatchJob` com fila dedicada `whatsapp` no Solid Queue. Finalizar `WhatsAppChannel` com adapter real do provider.

**Acceptance Criteria:**
- [x] `WhatsAppDispatchJob` criado (fila: `whatsapp`)
- [x] Pipeline: recebe `notification_alert_id` → verifica opt-in → DND → daily cap → rate limit → envia
- [x] `WhatsAppChannel` usa adapter real do provider (não mais stub)
- [x] Retry: 429 → backoff exponencial (5s, 10s, 20s), 5xx → retry 3x
- [x] 429 excessivo (3+) → auto-DND (desliga WA do usuário)
- [ ] Falha permanente → `WhatsAppMessage.status = "failed"` com error_message
- [ ] 3 threads na fila `whatsapp` (config em solid_queue.yml)
- [ ] Testes de dispatch com adapter mockado

**Technical Notes:**
- Seguir padrão de `PushDispatchJob` e `EmailDispatchJob`
- Retry config via `retry_on` do Active Job
- Auto-DND notifica usuário via push/email
- Fila `whatsapp` com polling间隔 de 2s no solid_queue.yml

**Dependencies:** FASE-3a.2 (channels), FASE-3a.3 (rate limiter), FASE-3b.3 (DND), FASE-3b.4 (tracking), FASE-3c.1 (templates)
**Complexity:** G (job + channel final + retry + auto-DND)
**Risks:** Adapter real do provider pode ter bugs não capturados em stub

**Files:**
- `app/jobs/whatsapp_dispatch_job.rb`
- `app/channels/whatsapp_channel.rb` (final)
- `app/services/whatsapp_provider.rb` (adapter real)
- `config/solid_queue.yml`
- `config/recurring.yml`
- `test/jobs/whatsapp_dispatch_job_test.rb`
