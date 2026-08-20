## [FASE-3c.3] Bridge Integration — NotificationAlertsService + Recurring

**Description:** Integrar WhatsAppDispatchJob no NotificationAlertsService. Configurar recurring.yml para jobs WA. Garantir que falha no WA não quebra push/email.

**Acceptance Criteria:**
- [ ] `NotificationAlertsService` dispara `WhatsAppDispatchJob` junto com push/email
- [ ] Falha no WA não afeta push/email (begin/rescue isolado por job)
- [ ] `recurring.yml` com `generate_whatsapp_alerts` (mesmo schedule que push/email)
- [ ] `WhatsappDailyCapResetJob` para resetar contagem diária à meia-noite
- [ ] `WhatsappTemplateSyncJob` agendado diariamente
- [ ] `WHATSAPP_DAILY_CAP` no `docker-compose.yml` e `.env.example`
- [ ] Testes de integração: alert → dispatch → WA (mockado)

**Technical Notes:**
- Bridge segue padrão exato de `PushDispatchJob.perform_later(alert.id)` na linha 114-115 do service
- WA é "best effort": se falhar, não retenta no nível do service (job gerencia retry)
- `WHATSAPP_PROVIDER` vazio = WA desligado (não disparar job)
- `WhatsappDailyCapResetJob` roda às 00:01 via recurring.yml

**Dependencies:** FASE-3c.2 (WhatsAppDispatchJob), FASE-3b.3 (daily cap)
**Complexity:** P (integração + recurring)
**Risks:** Baixo — padrão já estabelecido com push/email

**Files:**
- `app/services/notification_alerts_service.rb` (bridge)
- `app/jobs/whatsapp_daily_cap_reset_job.rb`
- `config/recurring.yml`
- `docker-compose.yml`
- `.env.example`
- `test/services/notification_alerts_service_test.rb`
