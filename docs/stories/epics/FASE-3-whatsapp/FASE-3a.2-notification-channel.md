## [FASE-3a.2] ApplicationChannel Abstraction

**Description:** Criar classe base abstrata `ApplicationChannel` com interface `deliver`, `valid_recipient?`, `rate_limiter`, `channel_name`. Refatorar `EmailChannel` e `PushChannel` para herdar da base. Criar `WhatsAppChannel` como stub.

**Acceptance Criteria:**
- [x] `ApplicationChannel` (base class) com interface definida em `app/channels/application_channel.rb`
- [x] `EmailChannel` refatorado para herdar de `ApplicationChannel`
- [x] `PushChannel` refatorado para herdar de `ApplicationChannel`
- [x] `WhatsappChannel` criado como stub (herda, mas `deliver` apenas loga)
- [x] `PushDispatchJob` e `EmailDispatchJob` refatorados para usar `PushChannel` e `EmailChannel`
- [ ] Testes unitários de cada canal
- [x] Testes de regressão: push e email continuam funcionando

**Technical Notes:**
- Seguir padrão de channel da architecture.md ADR-001
- Cada canal implementa `.deliver(message_payload)` que retorna `{ success: bool, message_id: string, error: string | nil }`
- Rate limiter é opcional (email não precisa, push usa Expo rate limits)
- `WhatsappChannel` stub loga mensagem em vez de enviar

**Dependencies:** FASE-3a.1 (provider adapter)
**Complexity:** M (refatoração + testes)
**Risks:** Refatoração pode quebrar push/email existente — testes obrigatórios

**Files:**
- `app/channels/application_channel.rb`
- `app/channels/email_channel.rb`
- `app/channels/push_channel.rb`
- `app/channels/whatsapp_channel.rb`
- `app/jobs/push_dispatch_job.rb` (refatorado)
- `app/jobs/email_dispatch_job.rb` (refatorado)
- `test/channels/`
