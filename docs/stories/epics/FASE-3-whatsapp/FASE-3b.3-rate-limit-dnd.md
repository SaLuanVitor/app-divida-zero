## [FASE-3b.3] Rate Limiter Enforcement + DND

**Description:** Integrar rate limiter completo no pipeline de envio WA. Implementar DND (Do Not Disturb) automático com configuração por usuário.

**Acceptance Criteria:**
- [x] Rate limiter integrado ao `WhatsAppChannel.deliver` — bloqueia se excedido
- [x] Limite diário por usuário: 10 mensagens/dia (contagem em `WhatsAppMessage`)
- [x] Limite diário global: 500/dia (configurável via `WHATSAPP_DAILY_CAP`)
- [x] DND configurável: `wa_dnd_start` (default 22:00) e `wa_dnd_end` (default 08:00)
- [x] Mensagens em horário DND são silenciosamente ignoradas (não enfileiradas)
- [x] Auto-DND: após 3 mensagens consecutivas com falha 429/rejected, desliga WA automaticamente
- [ ] Testes de: rate limit atingido, DND bloqueando, auto-DND trigger

**Technical Notes:**
- Contagem diária por usuário via `WhatsAppMessage.where(user: user, created_at: Date.current.all_day).count`
- DND usa fuso horário do usuário (ou default America/Sao_Paulo)
- Auto-DND notifica user (push/email) ao desligar automaticamente

**Dependencies:** FASE-3a.3 (rate limiter), FASE-3b.4 (WhatsAppMessage tracking)
**Complexity:** M (integração + lógica de negócio)
**Risks:** Contagem diária pode ter race condition em alta concorrência

**Files:**
- `app/channels/whatsapp_channel.rb` (rate limit + DND integrados)
- `app/services/whatsapp_rate_limiter.rb` (daily cap)
- `test/services/whatsapp_rate_limiter_test.rb`
