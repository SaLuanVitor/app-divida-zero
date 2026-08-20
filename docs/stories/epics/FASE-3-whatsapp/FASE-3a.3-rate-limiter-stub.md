## [FASE-3a.3] Rate Limiter + WhatsAppChannel Stub

**Description:** Implementar `WhatsappRateLimiter` com algoritmo token bucket (in-memory). Finalizar `WhatsAppChannel` stub com integração ao rate limiter.

**Acceptance Criteria:**
- [ ] `WhatsappRateLimiter` implementado com token bucket (burst=10, refill=1/s)
- [ ] Rate limiter por telefone (refill=1/5s por destinatário)
- [ ] `WhatsappChannel` usa rate limiter antes de "enviar"
- [ ] Rate limiter retorna `{ allowed: bool, retry_after: seconds }`
- [ ] Testes de estresse do rate limiter (burst, refill, concorrência)
- [ ] Configuração via ENV: `WHATSAPP_BURST_SIZE`, `WHATSAPP_REFILL_RATE`

**Technical Notes:**
- Token bucket in-memory (sem Redis para simplificar). Usar `ActiveSupport::Cache::MemoryStore`
- Buckets por escopo: `global` e `phone:<number>`
- Limpar buckets antigos periodicamente (TTL = 1 hora)
- Rate limiter DEVE ser thread-safe (mutex/semaphore)

**Dependencies:** FASE-3a.2 (WhatsAppChannel stub)
**Complexity:** M (algoritmo + testes de concorrência)
**Risks:** In-memory não persiste entre restarts — aceitável para POC inicial

**Files:**
- `app/services/whatsapp_rate_limiter.rb`
- `app/channels/whatsapp_channel.rb` (atualizado)
- `test/services/whatsapp_rate_limiter_test.rb`
