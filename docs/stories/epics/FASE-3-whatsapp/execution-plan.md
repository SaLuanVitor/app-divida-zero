# FASE 3 — WhatsApp: Execução e Arquitetura

> **Fase:** 3 — WhatsApp Business API
> **Estratégia:** 3 subfases incrementais, NotificationChannel polimórfico, rate limiting, prevenção de bloqueio
> **Owner:** SaLuanVitor · **Orquestração:** @aiox-master (Orion)
> **Provider:** A decidir (Z-API / Twilio / Meta Cloud API) — definido na Subfase 3a

---

## Arquitetura: Prevenção de Bloqueio no WhatsApp

O ecossistema WhatsApp Business API é rigoroso com spam e uso indevido.
**Não seguir estas regras = bloqueio permanente da conta business.**

### 1. Categorias de Mensagem (WhatsApp)

| Categoria | Exemplo | Limite | Opt-in necessário? |
|-----------|---------|--------|--------------------|
| **Authentication** | Código 2FA, reset de senha | Ilimitado | Sim (usuário iniciou) |
| **Utility** | Lembrete de vencimento, confirmação | Alto (1k+/dia) | Sim |
| **Marketing** | Promoções, dicas financeiras | Baixo (100-1k/dia) | Sim + template aprovado |
| **Service** | Resposta a dúvidas (24h window) | Ilimitado | Não (dentro da janela) |

**Decisão:** FASE 3 foca apenas em **Utility** (lembretes de vencimento e resumo semanal).
Authentication e Marketing ficam para fases futuras.

### 2. Rate Limiting

```
WhatsApp API: ~80 msg/s no tier inicial, ~1 msg/s por telefone
App Dívida Zero: precisa de rate limiter próprio para NÃO exceder

Estratégia: Token Bucket por provedor
  - bucket_size: 10 mensagens (burst)
  - refill_rate: 1 mensagem/segundo
  - refill_per_phone: 1 mensagem/5 segundos
```

### 3. Limite Diário

```
Por usuário:
  - Máx 10 mensagens/dia (qualquer categoria)
  - Máx 5 lembretes/dia
  - Respeitar DND do usuário (22h-8h)

Por app:
  - Começar conservador: 500 mensagens/dia
  - Escalar conforme quality score (monitorar)
  - Hard cap configurável via ENV: WHATSAPP_DAILY_CAP
```

### 4. Prevenção de Bloqueio

| Requisito | Implementação |
|-----------|---------------|
| Opt-in explícito | User aceita termos WA antes de qualquer envio |
| Opt-out a qualquer momento | Toggle "Receber por WhatsApp" desliga imediatamente |
| Quality Score monitor | Job diário consulta WhatsApp API, alerta se cair |
| Template pre-aprovado | Apenas templates HSM aprovados (utility) |
| Retry consciente | 429: backoff exponencial. 5xx: retry 3x max |
| DND automático | Não enviar entre 22h-8h (configurável) |

---

## Subfase 3a — Provider Discovery + NotificationChannel

### Objetivo
Pesquisar provedor, criar abstração de canal de notificação, refatorar canais existentes.

### Acceptance Criteria
- [ ] Pesquisa comparativa Z-API / Twilio / Meta Cloud API documentada
- [ ] Provedor escolhido com justificativa (custo, facilidade, limites)
- [ ] Abstraction `NotificationChannel` criada (base + interface)
- [ ] `EmailChannel` implementado usando a abstração
- [ ] `PushChannel` implementado usando a abstração
- [ ] `WhatsAppChannel` esboço (stub) criado
- [ ] Provider SDK integrado (gem/client HTTP)
- [ ] Testes unitários da abstração
- [ ] `WHATSAPP_PROVIDER`, `WHATSAPP_API_KEY` no .env.example

### Arquitetura: NotificationChannel

```
app/channels/
  application_channel.rb        # Base class
  email_channel.rb              # SMTP via Resend
  push_channel.rb               # Expo Push API
  whatsapp_channel.rb           # Provider SDK (stub na 3a)

Cada canal implementa:
  .deliver(message_payload)     # Envio síncrono
  .valid_recipient?(user)       # Verifica opt-in do usuário
  .rate_limiter                 # Rate limiter próprio do canal
```

### Data Model (3a)
- Nenhum modelo novo — apenas esboço do `WhatsAppChannel`

### Files
- `app/channels/application_channel.rb`
- `app/channels/email_channel.rb`
- `app/channels/push_channel.rb`
- `app/channels/whatsapp_channel.rb`
- `docs/research/YYYY-MM-DD-whatsapp-providers/` (pesquisa de provedores)
- `app/services/whatsapp_rate_limiter.rb` (token bucket)

---

## Subfase 3b — Opt-in + Verificação Telefônica

### Objetivo
Adicionar campo phone no User, verificação via código SMS/WhatsApp, preferências WA, prevenção de bloqueio.

### Acceptance Criteria
- [ ] Migration: `phone`, `phone_verified`, `wa_opt_in_at` no User
- [ ] Migration: `wa_notification_preferences` (JSONB) no User
- [ ] Migration: `whatsapp_messages` (tabela de tracking)
- [ ] Verificação de telefone (enviar código via provider)
- [ ] Endpoint `PATCH auth/phone` (enviar código)
- [ ] Endpoint `POST auth/phone/verify` (confirmar código)
- [ ] Endpoint `PATCH auth/whatsapp_notifications` (preferências)
- [ ] `User.wa_enabled_for_alert?` (similar email_enabled_for_alert?)
- [ ] Toggle WA no `me` endpoint (mobile exibe)
- [ ] Rate limiter: máx 3 tentativas de verificação/hora por IP
- [ ] Não enviar WA sem opt-in explícito (validação no channel)
- [ ] `WhatsAppRateLimiter` funcional (token bucket)
- [ ] Limite diário por usuário (10msgs/dia)
- [ ] DND automático (22h-8h)
- [ ] Testes de autorização e opt-in

### Data Model

```ruby
# Migration: AddWhatsAppFieldsToUsers
add_column :users, :phone, :string
add_column :users, :phone_verified, :boolean, default: false, null: false
add_column :users, :wa_opt_in_at, :datetime
add_column :users, :wa_notification_preferences, :jsonb, default: {}, null: false
add_index :users, :phone, unique: true

# Migration: CreateWhatsAppMessages
create_table :whatsapp_messages do |t|
  t.references :user, null: false, foreign_key: true
  t.string :provider_message_id
  t.string :template_name, null: false
  t.string :status, default: "pending", null: false  # pending | sent | delivered | read | failed | rejected
  t.text :error_message
  t.string :category, null: false  # authentication | utility | marketing
  t.jsonb :metadata, default: {}
  t.datetime :sent_at
  t.timestamps
end
add_index :whatsapp_messages, [:user_id, :created_at]
add_index :whatsapp_messages, :provider_message_id
```

### Preferências WA

```ruby
WA_PREFERENCE_DEFAULTS = {
  "wa_notifications_enabled" => false,  # Opt-in explícito (default false!)
  "wa_due_reminders" => true,
  "wa_weekly_summary" => true,
  "wa_dnd_start" => "22:00",
  "wa_dnd_end" => "08:00"
}.freeze
```

### Files
- `db/migrate/*_add_whatsapp_fields_to_users.rb`
- `db/migrate/*_create_whatsapp_messages.rb`
- `app/models/whatsapp_message.rb`
- `app/channels/whatsapp_channel.rb` (implementação real)
- `app/controllers/api/v1/auth_controller.rb` (novos endpoints phone)
- `app/services/whatsapp_rate_limiter.rb`
- `app/services/whatsapp_verification_service.rb`
- `test/` (testes de opt-in, rate limit, DND)

---

## Subfase 3c — Templates + Envio Automatizado

### Objetivo
Criar templates HSM, integrar com NotificationAlertsService, dispatch automatizado.

### Acceptance Criteria
- [ ] Templates HSM criados no provedor: `due_reminder`, `weekly_summary`, `overdue_alert`
- [ ] `WhatsAppTemplate` model (cache local dos templates)
- [ ] `WhatsAppDispatchJob` (enviar mensagem via channel)
- [ ] `WhatsAppAlertsService` ou bridge no `NotificationAlertsService`
- [ ] Message queue: fila `whatsapp` dedicada no Solid Queue
- [ ] Retry com backoff exponencial (429: 5s, 10s, 20s)
- [ ] Monitoramento: daily quality score job
- [ ] Dead letter: falhas permanentes vão para `WhatsAppMessage.status = "failed"`
- [ ] Limite diário global (ENV: `WHATSAPP_DAILY_CAP`, default 500)
- [ ] Dashboard de mensagens WA (admin)
- [ ] Testes de envio real com template

### Arquitetura: Fila e Dispatch

```
NotificationAlertsService
  → PushDispatchJob   (fila: default)
  → EmailDispatchJob  (fila: default)
  → WhatsAppDispatchJob (fila: whatsapp)  ← NOVO

WhatsAppDispatchJob
  1. Verifica opt-in do usuário (wa_enabled_for_alert?)
  2. Verifica DND (22h-8h? → skip)
  3. Verifica daily cap do usuário (< 10?)
  4. Verifica global daily cap
  5. Aplica rate limiter (token bucket)
  6. Busca template HSM
  7. Envia via WhatsAppChannel
  8. Registra WhatsAppMessage (status: sent)
  9. Falha 429 → re-agenda com backoff
 10. Falha permanente → status: failed
```

### Data Model

```ruby
create_table :whatsapp_templates do |t|
  t.string :provider_template_id, null: false
  t.string :name, null: false          # due_reminder | weekly_summary | overdue_alert
  t.string :language, default: "pt_BR", null: false
  t.jsonb :components, default: [], null: false  # header, body, footer, buttons
  t.string :status, default: "approved", null: false  # approved | pending | rejected
  t.datetime :last_synced_at
  t.timestamps
end
add_index :whatsapp_templates, :name, unique: true
```

### Files
- `db/migrate/*_create_whatsapp_templates.rb`
- `app/models/whatsapp_template.rb`
- `app/jobs/whatsapp_dispatch_job.rb`
- `app/jobs/whatsapp_daily_cap_reset_job.rb`
- `app/services/whatsapp_quality_monitor_job.rb`
- `recurring.yml` (novos jobs agendados)
- `docker-compose.yml` (WHATSAPP_DAILY_CAP, WHATSAPP_PROVIDER, WHATSAPP_API_KEY)
- `test/` (testes de dispatch, rate limit, template, integração)

---

## Workflow de Execução

```
┌─────────────────────────────────────────────────────────────┐
│                   FASE 3 — WhatsApp                           │
│                        (3 subfases)                          │
└─────────────────────────────────────────────────────────────┘

Subfase 3a: Provider + NotificationChannel
  @pm ─→ Criar PRD/Epic detalhado
  @architect ─→ Desenhar arquitetura NotificationChannel
  @sm ─→ Criar stories da 3a
  @po ─→ Validar stories
  @dev ─→ Implementar (pesquisa + abstração)
  @qa ─→ Quality Gate

Subfase 3b: Opt-in + Verificação + Rate Limit
  @sm ─→ Criar stories da 3b
  @po ─→ Validar stories
  @dev ─→ Implementar (phone, opt-in, rate limiter, DND)
  @qa ─→ Quality Gate (especial atenção a rate limit)

Subfase 3c: Templates + Dispatch Automatizado
  @sm ─→ Criar stories da 3c
  @po ─→ Validar stories
  @dev ─→ Implementar (templates HSM, dispatch, monitor)
  @qa ─→ Quality Gate + Teste de integração
  @devops ─→ Push + deploy
```

### Quality Gates Específicos WhatsApp

1. **Opt-in validation**: NENHUMA mensagem enviada sem opt-in confirmado
2. **Rate limit compliance**: Teste de estresse do token bucket
3. **DND enforcement**: Nenhuma mensagem enviada em horário proibido
4. **Template compliance**: Apenas templates HSM aprovados
5. **Daily cap**: Contagem diária respeita limites por usuário e global
6. **Rollback plan**: WA desligado não quebra push/email existente
7. **Provider failover**: Se provedor cair, mensagens entram em fila (não perdem)

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:-----------:|:-------:|-----------|
| Provider escolhido tem documentação fraca | Média | Alto | Prova de conceito antes de codificar |
| WhatsApp bloqueia conta business | Baixa | Crítico | Seguir quality score, opt-in, rate limit |
| Usuário não quer WA | Alta | Baixo | Opt-in default false, toggle simples |
| Custo do provedor alto | Média | Médio | Comparar preços antes de decidir |
| Template HSM rejeitado | Alta | Alto | Revisar política de templates antes de submeter |
| Rate limit mal configurado causa perda de msgs | Média | Alto | Testes de estresse + monitoramento |
