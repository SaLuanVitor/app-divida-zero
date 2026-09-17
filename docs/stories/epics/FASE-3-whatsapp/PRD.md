# PRD — FASE 3: WhatsApp Business API

> **Produto:** App Dívida Zero
> **Fase:** 3 — WhatsApp Business API
> **Autor:** Morgan (PM)
> **Data:** 2026-07-12
> **Status:** Rascunho
> **Owner:** SaLuanVitor

---

## 1. Business Context

### 1.1 Por que WhatsApp?

O App Dívida Zero já possui notificação push e email funcionais (FASE 1). No entanto:

- **Push notification** depende do app instalado e com permissão — muitos usuários desinstalam ou negam permissão.
- **Email** tem taxas de abertura tipicamente baixas (20-30%) em público brasileiro de finanças pessoais.
- **WhatsApp** é o canal mais ubíquo no Brasil: >99% dos smartphones brasileiros têm WhatsApp instalado. Taxa de abertura de mensagens ultrapassa 90%.

### 1.2 Valor para o Usuário

| Problema | Solução WA |
|----------|------------|
| Esquece de pagar contas | Lembrete de vencimento no WhatsApp com template "due_reminder" |
| Perde visão semanal | Resumo semanal automático via template "weekly_summary" |
| Não vê notificações push | Alternativa de alto impacto sem depender de push token |
| Desconfia de SMS (golpes) | Mensagem oficial com template aprovado, vindo do app |

### 1.3 Alinhamento com Arquitetura Existente

- Reutiliza `NotificationAlertsService` — o WA entra como mais um canal de dispatch (linha 114-115 do service atual).
- Segue o mesmo padrão de `PushDispatchJob` e `EmailDispatchJob`: `WhatsAppDispatchJob` recebe `notification_alert_id`, verifica preferências, envia.
- `wa_notification_preferences` (JSONB) segue o padrão de `push_preferences` e `email_notification_preferences`.
- Fila dedicada `whatsapp` no Solid Queue para não competir com push/email.

---

## 2. Provider Decision Framework

### 2.1 Provedores Considerados

#### Z-API
- **Modelo:** Brasileiro, focado em WhatsApp API não-oficial (via WhatsApp Web)
- **Pricing:** R$ 0,03-0,10/msg (planos de 500 a 50k msgs/mês)
- **Setup:** Simples — API Key + instance token. Documentação em português.
- **Compliance:** Não é parceiro Meta oficial. Risco de bloqueio aumentado.
- **Rate Limits:** ~5 msg/s (plano médio). Sem limite claro documentado.
- **Brazilian Market:** Excelente — suporte BR, docs em PT-BR, comunidade grande.
- **Integração:** REST API simples. Gem não oficial disponível.

#### Twilio
- **Modelo:** Internacional, parceiro oficial Meta Business Solution Provider
- **Pricing:** ~$0,05/msg (conversation-based). Custo total maior com taxas.
- **Setup:** Moderado — precisa configurar WhatsApp Sender, templates no Meta Business.
- **Compliance:** Oficial Meta. Menor risco de bloqueio.
- **Rate Limits:** 80 msg/s (tier 1). 1 msg/s por telefone.
- **Brazilian Market:** Suporte multilíngue, mas documentação em inglês. Suporte via ticket.
- **Integração:** Gem `twilio-ruby` madura (~5M downloads).

#### Meta Cloud API (Direct)
- **Modelo:** Direto com Meta WhatsApp Business Platform
- **Pricing:** $0,005/msg (utility) — mais barato por mensagem
- **Setup:** Complexo — precisa de Business Account, System User, Webhook, WABA
- **Compliance:** Oficial Meta. Menor risco de bloqueio.
- **Rate Limits:** 80 msg/s (tier 1). 1 msg/s por telefone. Escala com quality score.
- **Brazilian Market:** Documentação em inglês. Sem suporte local dedicado.
- **Integração:** REST API pura (sem gem). Precisa de WABA + número Business.

### 2.2 Tabela Comparativa

| Critério | Z-API | Twilio | Meta Cloud API |
|----------|-------|--------|----------------|
| **Custo/msg (Utility)** | R$ 0,03-0,10 | ~$0,05 (~R$ 0,28) | $0,005 (~R$ 0,028) |
| **Custo mensal (1k msgs)** | R$ 30-100 | ~R$ 280 | ~R$ 28 |
| **Setup Complexity** | ★☆☆ (dias) | ★★☆ (1-2 semanas) | ★★★ (3-4 semanas) |
| **Documentação** | ★★★ (PT-BR) | ★★★ (EN) | ★★☆ (EN, fragmentada) |
| **Suporte BR** | ★★★ (WhatsApp BR) | ★★☆ (Ticket EN) | ★☆☆ (Sem suporte local) |
| **Risco Bloqueio** | ★★★ (Alto) | ★☆☆ (Baixo) | ★☆☆ (Baixo) |
| **Rate Limit (burst)** | ~5 msg/s | 80 msg/s | 80 msg/s |
| **Templates HSM** | Limitado | Suporte completo | Suporte completo |
| **Webhook** | Nativo | Configurável | Obrigatório |
| **Gem/Cliente Ruby** | REST (custom) | `twilio-ruby` | REST (custom) |
| **Escalabilidade** | ★★☆ | ★★★ | ★★★ |

### 2.3 Recomendação

**Iniciar com Z-API (Subfase 3a/3b)** para validação rápida, devido a:
- Custo inicial baixo e setup em dias (versus semanas)
- Documentação em português e suporte local
- API REST simples para prototipagem

**Planejar migração para Meta Cloud API (Subfase 3c ou FASE 4)** quando:
- Volume de mensagens ultrapassar 5k/mês (break-even vs Z-API)
- Necessidade de templates HSM avançados
- Quality score precisar de mais controle

**Twilio como fallback** se Meta Cloud API for complexa demais.

> **Decisão final:** Documentar PoC com Z-API e Meta Cloud API antes de codificar (AC da Subfase 3a).

---

## 3. Feature Requirements

### 3.1 Subfase 3a — Provider Discovery + NotificationChannel

**Objetivo:** Pesquisar provedor, criar abstração de canal, refatorar canais existentes.

| ID | Requisito | Prioridade |
|----|-----------|------------|
| F3a-01 | Pesquisa comparativa dos 3 provedores documentada | Must |
| F3a-02 | Abstração `NotificationChannel` (base + interface) | Must |
| F3a-03 | `EmailChannel` refatorado usando abstração | Must |
| F3a-04 | `PushChannel` refatorado usando abstração | Must |
| F3a-05 | `WhatsAppChannel` stub criado | Must |
| F3a-06 | Provider SDK integrado (gem ou cliente HTTP) | Must |
| F3a-07 | `WhatsAppRateLimiter` (token bucket) criado | Should |
| F3a-08 | Variáveis `WHATSAPP_PROVIDER`, `WHATSAPP_API_KEY` no .env.example | Must |
| F3a-09 | Testes unitários da abstração `NotificationChannel` | Must |

### 3.2 Subfase 3b — Opt-in + Verificação Telefônica + Rate Limit

**Objetivo:** Adicionar phone, opt-in WA, rate limiting, DND.

| ID | Requisito | Prioridade |
|----|-----------|------------|
| F3b-01 | Migration: `phone`, `phone_verified`, `wa_opt_in_at` no User | Must |
| F3b-02 | Migration: `wa_notification_preferences` (JSONB) no User | Must |
| F3b-03 | Migration: `whatsapp_messages` tabela de tracking | Must |
| F3b-04 | Verificação de telefone via código SMS/WA | Must |
| F3b-05 | Endpoint `PATCH auth/phone` (enviar código) | Must |
| F3b-06 | Endpoint `POST auth/phone/verify` (confirmar código) | Must |
| F3b-07 | Endpoint `PATCH auth/whatsapp_notifications` (preferências) | Must |
| F3b-08 | `User.wa_enabled_for_alert?` (similar email_enabled_for_alert?) | Must |
| F3b-09 | Toggle WA no endpoint `me` (mobile exibe) | Must |
| F3b-10 | Rate limiter verificação: máx 3 tentativas/hora por IP | Must |
| F3b-11 | Opt-in explícito validado no channel (default false) | Must |
| F3b-12 | `WhatsAppRateLimiter` funcional (token bucket) | Must |
| F3b-13 | Limite diário: máx 10 msgs/dia por usuário | Must |
| F3b-14 | DND automático: não enviar entre 22h-8h | Must |
| F3b-15 | Testes de autorização, opt-in, rate limit, DND | Must |

### 3.3 Subfase 3c — Templates + Dispatch Automatizado

**Objetivo:** Criar templates HSM, integrar com NotificationAlertsService, dispatch.

| ID | Requisito | Prioridade |
|----|-----------|------------|
| F3c-01 | Templates HSM no provedor: `due_reminder`, `weekly_summary`, `overdue_alert` | Must |
| F3c-02 | `WhatsAppTemplate` model (cache local dos templates) | Must |
| F3c-03 | `WhatsAppDispatchJob` — enviar via channel | Must |
| F3c-04 | Bridge no `NotificationAlertsService` (dispatch WA junto com push/email) | Must |
| F3c-05 | Fila `whatsapp` dedicada no Solid Queue | Must |
| F3c-06 | Retry com backoff exponencial (429: 5s, 10s, 20s) | Must |
| F3c-07 | Dead letter: falhas permanentes → status "failed" | Must |
| F3c-08 | Limite diário global (ENV: `WHATSAPP_DAILY_CAP`, default 500) | Must |
| F3c-09 | Job diário de monitoramento de quality score | Should |
| F3c-10 | Dashboard admin de mensagens WA | Could |
| F3c-11 | Testes de dispatch, rate limit, template, integração | Must |

---

## 4. User Stories

### Epic: Como usuário, quero receber lembretes de contas via WhatsApp para não esquecer pagamentos

#### Subfase 3a (Foundation)

```
US-3a-01: Como desenvolvedor, quero uma pesquisa comparativa de provedores WhatsApp
           para decidir qual integrar com menor risco e custo.
           AC: Documento com Z-API/Twilio/Meta Cloud, recomendação, custo estimado.

US-3a-02: Como desenvolvedor, quero uma abstração NotificationChannel para que
           novos canais de notificação sigam o mesmo contrato sem duplicar código.
           AC: Base + EmailChannel + PushChannel refatorados + WhatsAppChannel stub.

US-3a-03: Como desenvolvedor, quero um rate limiter reutilizável (token bucket)
           para não exceder limites da WhatsApp API.
           AC: Token bucket configurável por canal, testado unitariamente.
```

#### Subfase 3b (Opt-in & Rate Limits)

```
US-3b-01: Como usuário, quero cadastrar e verificar meu telefone no app para
           receber notificações via WhatsApp.
           AC: Input phone + código de verificação + confirmação.

US-3b-02: Como usuário, quero ativar/desativar WhatsApp nas preferências de
           notificação para controlar por onde recebo avisos.
           AC: Toggle WA em Configurações > Notificações, default desligado.

US-3b-03: Como usuário, quero definir meu horário de silêncio (DND) para não
           receber mensagens WA durante a noite.
           AC: Default 22h-8h, configurável.

US-3b-04: Como sistema, quero limitar a 10 mensagens WA/dia por usuário para
           evitar spam e bloqueio do WhatsApp.
           AC: Contador diário, reset à meia-noite, hard stop ao atingir limite.
```

#### Subfase 3c (Dispatch Automatizado)

```
US-3c-01: Como usuário, quero receber "Lembrete de Vencimento" no WhatsApp
           quando uma conta estiver perto do vencimento.
           AC: Template due_reminder enviado via WhatsAppDispatchJob.

US-3c-02: Como usuário, quero receber "Resumo Semanal" no WhatsApp toda
           sexta-feira com minhas pendências da semana.
           AC: Template weekly_summary com valores, same schedule do email.

US-3c-03: Como usuário, quero receber "Alerta de Atraso" no WhatsApp
           automaticamente quando uma conta vencer.
           AC: Template overdue_alert com valor e dias de atraso.

US-3c-04: Como sistema, quero que mensagens WA com falha temporária entrem
           em fila de retry para não perder notificações.
           AC: Backoff exponencial, dead letter após 3 falhas.
```

---

## 5. Success Metrics

| Métrica | Alvo (FASE 3) | Como medir |
|---------|---------------|------------|
| **Opt-in rate** | ≥ 15% dos usuários ativos | `wa_opt_in_at` preenchido / total de usuários |
| **Delivery rate** | ≥ 95% | `WhatsAppMessage.status = "sent"` / total enviado |
| **Read rate** | ≥ 70% | Status webhook "read" (se provedor suportar) |
| **Daily active WA users** | ≥ 5% dos usuários ativos recebendo WA | Contagem de `WhatsAppMessage` por usuário/dia |
| **Quality Score** | ≥ 80 (Meta) ou equivalente | Job diário de monitoramento |
| **Block rate** | 0 bloqueios | Alerta de quality score < 50 |
| **Cost per user/mês** | < R$ 0,50 | Custo total do provedor / usuários ativos WA |
| **Channel reliability** | ≥ 99% uptime do provider | Health check do provider a cada 5 min |

---

## 6. Non-Functional Requirements

### 6.1 Rate Limiting

| Escopo | Limite | Implementação |
|--------|--------|---------------|
| Burst (app → provider) | 10 msg/s | Token bucket: bucket_size=10, refill=1/s |
| Por telefone | 1 msg/5s | Refill rate configurado por phone |
| Por usuário/dia | 10 msgs | Contagem em `WhatsAppMessage` por user no dia |
| Global/dia | 500 (default) | ENV `WHATSAPP_DAILY_CAP`, reset meia-noite |
| Verificação phone | 3 tentativas/hora/IP | Rate limiter no controller |

### 6.2 Message Queuing

```
Pipeline completo:

NotificationAlertsService
  → cria NotificationAlert
  → enfileira PushDispatchJob  (fila: default)
  → enfileira EmailDispatchJob (fila: default)
  → enfileira WhatsAppDispatchJob (fila: whatsapp)  ← NOVO

WhatsAppDispatchJob (fila: whatsapp, retry: 3)
  1. Carrega alert + user
  2. Verifica wa_enabled_for_alert?
  3. Verifica DND (22h-8h → skip silencioso)
  4. Verifica daily cap do usuário (< 10)
  5. Verifica global daily cap
  6. Aplica WhatsAppRateLimiter (token bucket)
  7. Busca template HSM por alert_type
  8. Envia via WhatsAppChannel
  9. Registra WhatsAppMessage (status: sent)
  10. 429 → re-agenda com backoff (5s, 10s, 20s)
  11. Falha permanente → status: failed
```

### 6.3 Blocking Prevention

| Mecanismo | Detalhes |
|-----------|----------|
| Opt-in explícito | `wa_notifications_enabled` = false por padrão |
| Opt-out imediato | Toggle desliga e para envios futuros |
| DND automático | Default 22h-8h, sem mensagens |
| Templates aprovados | Apenas templates HSM aprovados ("approved") |
| Quality monitor | Job diário consulta quality score |
| Daily caps | Usuário (10) + Global (500) |
| Categorias restritas | Apenas "utility" — sem marketing |
| Retry consciente | Exponencial, nunca forçar |

### 6.4 Observability

- `WhatsAppMessage` com status tracking (pending → sent → delivered → read → failed)
- Job `WhatsAppQualityMonitor` executado diariamente
- Logs estruturados em todos os pontos de falha
- Dashboard admin com contagem de mensagens, delivery rate, erros
- Alerta se quality score < 60 ou block rate > 1%

---

## 7. Risks

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:-----------:|:-------:|-----------|
| **Provider lock-in** | Alta | Alto | Abstração `NotificationChannel` permite trocar provider sem refatorar canais |
| **WhatsApp blocking** | Baixa | Crítico | Opt-in, DND, rate limit, templates aprovados, quality monitoring |
| **Template HSM rejection** | Alta | Alto | Revisar política de templates Meta antes de submeter; ter fallback de conteúdo |
| **Cost escalation** | Média | Médio | Começar com Z-API (baixo custo), migrar para Meta Cloud API no break-even |
| **Low opt-in rate** | Média | Médio | Educar usuário na tela de configurações sobre benefícios do WA |
| **Rate limit misconfiguration** | Média | Alto | Testes de estresse do token bucket antes de produção |
| **Provider downtime** | Baixa | Alto | Fila do Solid Queue segura mensagens até provider voltar |
| **Phone number reuse** | Baixa | Médio | Validar phone único; vincular a apenas um user por vez |
| **Webhook reliability** | Média | Médio | Usar Solid Queue para processar webhooks; retry em falha |

---

## 8. Architecture Decisions

### ADR-301: NotificationChannel Abstraction

**Status:** Proposto

**Contexto:** Atualmente `PushDispatchJob` e `EmailDispatchJob` têm lógica de envio inline. Precisamos de um contrato comum.

**Decisão:** Criar `ApplicationChannel` como base class com métodos `deliver`, `valid_recipient?`, e `rate_limiter`. Cada canal (email, push, whatsapp) herda e implementa.

**Consequências:**
- Positiva: Novo canal (ex: SMS) segue mesmo padrão
- Positiva: Testes podem mockar o channel
- Negativa: Refatoração de canais existentes (3a)

### ADR-302: Fila Dedicada para WhatsApp

**Status:** Proposto

**Contexto:** Mensagens WA têm rate limits mais restritivos que push/email. Precisam de fila separada para não competir.

**Decisão:** Criar fila `whatsapp` no Solid Queue. Jobs WA sempre vão para essa fila.

**Consequências:**
- Positiva: Rate limiting independente de push/email
- Positiva: Prioridade configurável via Solid Queue
- Positiva: Dead letter isolada

### ADR-303: Rate Limiter via Token Bucket

**Status:** Proposto

**Contexto:** WhatsApp API tem limites rigorosos. Precisamos de controle preciso.

**Decisão:** Implementar `WhatsAppRateLimiter` usando algoritmo Token Bucket, reutilizável para outros canais.

**Consequências:**
- Positiva: Burst controlado, refill suave
- Positiva: Não depende do provider
- Negativa: Precisa de estado compartilhado (Redis ou memória)

---

## 9. Dependencies & Interfaces

### 9.1 Backend

```
Gemfile
  ├── twilio-ruby (se Twilio escolhido)
  └── (Z-API: cliente HTTP custom; Meta: REST puro)

.env
  ├── WHATSAPP_PROVIDER=zapi|twilio|meta
  ├── WHATSAPP_API_KEY=
  ├── WHATSAPP_DAILY_CAP=500
  └── WHATSAPP_DND_START=22:00
      WHATSAPP_DND_END=08:00
```

### 9.2 Mobile

```
src/
  services/
    whatsapp.ts              # API calls (phone verify, preferences)
  screens/
    app/
      Configuracoes/
        Notificacoes.tsx     # Add WA toggle + DND config (existing screen)
  types/
    user.ts                  # wa_notification_preferences added
```

### 9.3 Integration Points

| Componente | Integração |
|------------|-----------|
| `NotificationAlertsService` | Chama `WhatsAppDispatchJob.perform_later` após push/email |
| `WhatsAppDispatchJob` | Enfileira na fila `whatsapp` |
| `WhatsAppChannel` | Envia via provider SDK |
| `WhatsAppRateLimiter` | Token bucket (memória/Redis) |
| `WhatsAppMessage` | Tracking de status |
| `WhatsAppTemplate` | Cache local de templates HSM |
| Recurring jobs | `generate_due_alerts` + `generate_weekly_summary_alerts` já disparam |

---

## 10. Success Criteria & Exit Criteria

### FASE 3 Completa quando:

1. [ ] Usuário pode cadastrar e verificar telefone
2. [ ] Usuário pode ativar/desativar WA nas preferências
3. [ ] Lembretes de vencimento enviados por WA (due_today, near_due, overdue)
4. [ ] Resumo semanal enviado por WA
5. [ ] Rate limiting funcional (usuário + global + token bucket)
6. [ ] DND respeitado (22h-8h sem mensagens)
7. [ ] Opt-in padrão desligado (nenhuma mensagem sem consentimento)
8. [ ] Todas as mensagens trackeadas em `WhatsAppMessage`
9. [ ] Falhas com retry (backoff exponencial)
10. [ ] Quality gates passam: lint, typecheck, tests

### Rollback Plan

- Desligar `WHATSAPP_PROVIDER` → nenhum job WA executa
- Push/email continuam funcionando independentemente
- Migration de `phone`/`wa_notification_preferences` é reversível
- Tabelas `whatsapp_messages` e `whatsapp_templates` podem ser truncadas sem perda

---

*— Morgan, planejando o futuro 📊*
