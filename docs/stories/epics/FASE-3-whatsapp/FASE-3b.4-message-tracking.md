## [FASE-3b.4] WhatsApp Message Tracking

**Description:** Criar modelo `WhatsAppMessage` para rastrear mensagens enviadas, status, erros, provider_message_id. Incluir webhook para atualização de status.

**Acceptance Criteria:**
- [ ] Migration: criar `whatsapp_messages` (user, provider_message_id, template_name, status, category, error_message, sent_at, metadata)
- [ ] Model `WhatsAppMessage` com enum de status: pending → sent → delivered → read → failed | rejected
- [ ] Endpoint webhook `POST /api/v1/whatsapp/webhook` para receber status updates do provider
- [ ] Webhook autenticado por token secreto (`WHATSAPP_WEBHOOK_SECRET`)
- [ ] Testes de criação, transição de status, webhook

**Technical Notes:**
- Status lifecycle: `pending → sent → delivered → read` (sucesso) ou `pending → sent → failed | rejected` (falha)
- Provider message ID único por provider
- Webhook deve ignorar mensagens duplicadas (idempotente por provider_message_id)
- Reutilizar Cloudflare Tunnel já configurado para expor webhook

**Dependencies:** FASE-3a.1 (provider escolhido)
**Complexity:** P (model + endpoint webhook)
**Risks:** Provedores diferentes têm formatos de webhook diferentes

**Files:**
- `db/migrate/*_create_whatsapp_messages.rb`
- `app/models/whatsapp_message.rb`
- `app/controllers/api/v1/whatsapp_controller.rb` (webhook)
- `config/routes.rb`
- `test/models/whatsapp_message_test.rb`
