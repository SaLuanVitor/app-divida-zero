# Plano de Evolução — App Dívida Zero (pós-TCC)

> Objetivo: remover as limitações impostas para a entrega do TCC e evoluir o produto
> (email, push real, WhatsApp, integração bancária/auto-registro, família compartilhada),
> **corrigindo primeiro as inconsistências existentes**.
>
> Estratégia priorizada pelo dono do projeto: **começar pelo gratuito/simples**;
> serviços pagos/regulados (WhatsApp, Open Finance) ficam para fases posteriores.

Data: 2026-07-10 · Owner: SaLuanVitor · Orquestração: @aiox-master (Orion)

---

## Estado atual (diagnóstico)

**Monorepo** `SaLuanVitor/app-divida-zero` (branch `main`, público):
- `mobile/` — Expo / React Native (código completo)
- `backend/api_divida_zero/` — Rails 8.1 API + **PostgreSQL** (`config/database.yml`) + stack Solid (`solid_queue`, `solid_cache`, `solid_cable`), deploy Docker Compose.
- `modelosTelas/`, `requisitos/`, `docs/`, `scripts/`

**Infraestrutura atual (pós-Railway):**
- Self-hosting via Docker Compose: `api-prod` (porta 3000, banco produção) + `api-dev` (porta 3001, banco desenvolvimento)
- Cloudflare Tunnel para expor `api-prod` ao celular via URL pública
- `AI_API_KEY` carregada via `env_file` no Docker

**Já existe no backend:** auth completo, IA, gamificação, financial_records/goals, reports, analytics, admin, `notification_alerts_service` + jobs, agendador `recurring.yml`, push notifications (Expo Push API), email SMTP (Resend).

**Limitações de TCC (parametrizadas, não removidas):**
- IA controlada por `EXPO_PUBLIC_PHASE_1_MODE=true` ([featurePhase.ts](../mobile/src/config/featurePhase.ts))
- Notificações push implementadas mas dependem de build EAS para ativar surfaces de IA

---

## FASE 0 — Higienização 🩹

- [x] **Baseline de qualidade**: typecheck ✅, testes mobile 68/68 ✅.
- [x] **Bug overlay**: corrigido via `AppOverlay`/`AppToast`.
- [ ] **Catálogo de inconsistências**: dono lista os erros observados.
- [ ] Corrigir e cobrir com teste.

---

## FASE 1 — Reativar o existente 🔓

- [x] **Email real (SMTP)**: configurado com Resend SMTP, mailers de reset/welcome com views e testes.
- [x] **Push notifications real**: `DeviceToken` model, `DevicesController`, `ExpoPushService`, `PushDispatchJob`, mobile com registro/remoção/handler/badge.
- [x] **Reativar IA**: parametrização OpenRouter, `featurePhase.ts`, `eas.json` com 5 surfaces, retry/backoff mobile, testes `UsageGuard`.
- [x] **`AI_API_KEY` no ambiente**: carregada via `env_file` no Docker Compose.
- [ ] **Notificação email opt-in**: preferência do usuário para receber lembretes de vencimento e resumo semanal por email.
- [ ] **Teste de entrega SMTP**: validar envio real (reset de senha, opt-in).

---

## FASE 2 — Família / Contas compartilhadas 👨‍👩‍👧

✅ **COMPLETA** — Backend + Mobile + Testes (28 testes de autorização e escopo).

- [x] Modelos: `Household`, `HouseholdMembership`, `HouseholdInvitation`
- [x] Escopo de dados: `financial_records` e `financial_goals` com `household_id`
- [x] Endpoints: CRUD famílias, convites por email, listagem compartilhada
- [x] Mobile: `Familia.tsx`, `Convidar.tsx`, `ConvitesPendentes.tsx`, indicador de autoria
- [x] Testes de autorização (28 testes)

---

## FASE 3 — WhatsApp 💬 (pago/regulado)

**Status:** Planejado (dividido em 3 subfases)
**Detalhamento:** `docs/stories/epics/FASE-3-whatsapp/execution-plan.md`

### Subfase 3a — Provider Discovery + NotificationChannel
- [ ] Pesquisa comparativa de provedores (Z-API / Twilio / Meta Cloud API) com POC
- [ ] Abstração `NotificationChannel` (base + interface)
- [ ] `EmailChannel` / `PushChannel` / `WhatsAppChannel` (stub) implementados
- [ ] `WhatsAppRateLimiter` (token bucket)
- [ ] Provider SDK integrado e configurado

### Subfase 3b — Opt-in + Verificação + Rate Limit
- [ ] Campo `phone` no User + verificação por código
- [ ] Preferências WhatsApp (`wa_notification_preferences`, default false)
- [ ] Tabela `whatsapp_messages` (tracking de envios)
- [ ] DND automático (22h-8h, configurável)
- [ ] Rate limit por usuário (10 msgs/dia) e global (500/dia)
- [ ] Endpoints de gerenciamento (`auth/phone`, `auth/phone/verify`, `auth/whatsapp_notifications`)
- [ ] Testes de opt-in, rate limit, DND

### Subfase 3c — Templates HSM + Dispatch Automatizado
- [ ] Templates HSM criados: `due_reminder`, `weekly_summary`, `overdue_alert`
- [ ] `WhatsAppDispatchJob` (fila dedicada `whatsapp`)
- [ ] Retry com backoff exponencial (429), dead letter para falhas permanentes
- [ ] Bridge com `NotificationAlertsService`
- [ ] Job de monitoramento de quality score WhatsApp
- [ ] Dashboard admin de mensagens WA
- [ ] Testes de integração com template real

---

## FASE 4 — Importação de extratos + Open Finance 🏦 (sem custo) — STORIES CRIADAS

**Estratégia:** Importação manual OFX/CSV agora → Open Finance direto (Bacen) no futuro
**Custo:** Zero (sem agregador pago)
**Detalhamento:** `docs/stories/epics/FASE-4-bank-integration/execution-plan.md`

### Subfase 4a1 — Upload + Parsing + IA + Mobile

| Story | Descrição | Status |
|:-----:|-----------|:------:|
| [4.1](/docs/stories/epics/FASE-4-bank-integration/story-4.1-model-migration.md) | Model + Migration ImportedTransaction | 📝 Pronto |
| [4.2](/docs/stories/epics/FASE-4-bank-integration/story-4.2-parser-services.md) | OFX/CSV Parser Services | 📝 Pronto |
| [4.3](/docs/stories/epics/FASE-4-bank-integration/story-4.3-ai-dedup.md) | AI Categorization + Dedup Services | 📝 Pronto |
| [4.4](/docs/stories/epics/FASE-4-bank-integration/story-4.4-upload-endpoints.md) | Upload + Status Endpoints + Job | 📝 Pronto |
| [4.5](/docs/stories/epics/FASE-4-bank-integration/story-4.5-review-endpoints.md) | Review + Accept Endpoints | 📝 Pronto |
| [4.6](/docs/stories/epics/FASE-4-bank-integration/story-4.6-mobile-import.md) | Mobile: Import + Review Screens | 📝 Pronto |

### Subfase 4b — Open Finance Direto (futuro)
- [ ] Pesquisa certificação Bacen
- [ ] Interface `BankProvider`
- [ ] Conector Open Finance
- [ ] Webhook sync automático
- [ ] Reutilizar pipeline categorização + dedup

---

## Riscos / decisões pendentes

- **Testes do backend**: `bin/rails test` sem PostgreSQL local — estabilizar setup de teste via Docker.
- **WhatsApp** (Fase 3): provedor + custo + verificação Business.
- **Open Finance** (Fase 4): certificação Bacen necessária para OF direto (2-4 meses).
- **Dedup:** risco de duplicatas entre importação e registros manuais — mitigado por fuzzy match + revisão.
