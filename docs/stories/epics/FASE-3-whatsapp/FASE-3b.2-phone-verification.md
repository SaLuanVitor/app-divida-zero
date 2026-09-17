## [FASE-3b.2] Phone Verification Flow

**Description:** Implementar fluxo de verificação de telefone: enviar código via WhatsApp/provider, confirmar código, limite de tentativas (3/hora).

**Acceptance Criteria:**
- [x] Endpoint `PATCH /api/v1/auth/phone` — solicita código de verificação (envia via WA)
- [x] Endpoint `POST /api/v1/auth/phone/verify` — confirma código
- [x] Código de 6 dígitos, expira em 10 minutos
- [ ] Máx 3 tentativas de verificação por hora por IP
- [x] Máx 3 envios de código por hora por telefone
- [x] `phone_verified = true` após confirmação bem-sucedida
- [x] Opt-in (`wa_notifications_enabled`) ativado automaticamente após verificação
- [ ] Testes de fluxo completo + rate limit

**Technical Notes:**
- Armazenar código hasheado (BCrypt) em cache/memória — não em banco
- Usar `ActiveSupport::Cache::MemoryStore` com TTL de 10min
- Reutilizar `WhatsAppChannel` para enviar código (template `verification_code`)
- Limite de rate por IP usando Rack::Attack ou cache simples

**Dependencies:** FASE-3b.1 (phone field), FASE-3a.3 (WhatsAppChannel funcional)
**Complexity:** M (fluxo + rate limit + testes)
**Risks:** Código pode não chegar se provider estiver instável

**Files:**
- `app/controllers/api/v1/auth_controller.rb` (phone, verify)
- `app/services/whatsapp_verification_service.rb`
- `config/routes.rb`
- `test/controllers/api/v1/auth_controller_test.rb`
