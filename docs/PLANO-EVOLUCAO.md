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
- `backend/api_divida_zero/` — Rails 8.1 API + **PostgreSQL** (`config/database.yml`) + stack Solid (`solid_queue`, `solid_cache`, `solid_cable`), deploy Kamal/Railway. Há `docker-compose.yml` na raiz com serviço `db` (postgres:16).
- `modelosTelas/`, `requisitos/`, `docs/`, `scripts/`

**Limitações de TCC (parametrizadas, não removidas):**
- IA desligada via `EXPO_PUBLIC_PHASE_1_MODE=true` ([featurePhase.ts](../mobile/src/config/featurePhase.ts), [ADR-0001](adr/ADR-0001-fase1-sem-ia.md)). Backend de IA preservado e funcional.
- Notificações **100% locais no dispositivo** (`expo-notifications`); jobs backend geram alertas **in-app** (`notification_alert`), mas **não há push server, email nem WhatsApp**.
- XP notifications hard-desligadas (`DEVICE_XP_NOTIFICATIONS_ENABLED = false`).

**Já existe no backend:** auth completo (register/login/refresh/forgot/reset/profile), IA (`ai#next_action|alerts|categorize_record|reports_briefing|feedback`, daily messages), gamificação, financial_records/goals, reports, analytics, admin, `notification_alerts_service` + jobs `generate_due_alerts_job` / `generate_weekly_summary_alerts_job`, agendador `recurring.yml`.

**Não existe (features novas):**
- Envio real de **email** (mailers vazios; SMTP comentado em `production.rb`)
- **WhatsApp**
- **Integração bancária / auto-registro** (records são 100% manuais: index/create/destroy/pay/status)
- **Família / compartilhamento** (`User` não tem household; dados escopados por `user_id`)
- **Push server-side** (mobile é local-only; sem registro de Expo push token)

---

## FASE 0 — Higienização (PRIMEIRO) 🩹

Corrigir inconsistências antes de qualquer feature nova.

- [ ] **Baseline de qualidade**: rodar `npm test` (mobile Jest), `npm run lint`, `npm run typecheck` no mobile; `bin/rails test` no backend. Registrar o que passa/falha hoje.
- [ ] **Bug "mensagem atrás do componente"** (z-index/overlay): reproduzir e corrigir. Suspeita: toasts/feedbacks e overlays (`OverlayContext`, `BottomInsetContext`, modais em Home/Lancamentos/Metas/Profile/Relatorios) sem camada raiz e sem `zIndex/elevation` adequados (só 3 usos de zIndex/elevation em todo o mobile). Padronizar um layer de overlay/toast no topo da árvore.
- [ ] **Catálogo de inconsistências**: o dono lista os erros concretos observados (telas, fluxos, mensagens). Auditoria cruzada de: estados de erro sobrepostos, foco de teclado (`FormKeyboardContext`), navegação, e mensagens de validação.
- [ ] Corrigir e cobrir com teste onde fizer sentido.

**Entregável:** app estável, testes verdes de referência, bug de overlay resolvido.

---

## FASE 1 — Reativar o existente (grátis, baixo risco) 🔓

- [ ] **Email real (SMTP)**: configurar provedor com free tier (Brevo/Resend/Gmail SMTP), `action_mailer.smtp_settings` via credentials, `default_url_options` correto.
  - [ ] Mailers: `PasswordResetMailer` (fechar o loop do "esqueci a senha" que hoje não envia), `AccountMailer` (boas-vindas).
  - [ ] Teste de entrega em staging.
- [ ] **Push notifications real (grátis — Expo Push API)**:
  - [ ] Endpoint p/ registrar Expo push token do device (novo: `POST /devices` + modelo `device_token`).
  - [ ] Bridge dos jobs `generate_due_alerts_job` / `weekly_summary` → envio via Expo Push (além do alerta in-app atual).
  - [ ] Mobile: enviar token no login/refresh de permissão.
- [ ] **Reativar IA (Fase 1 → Fase 2)**: `EXPO_PUBLIC_PHASE_1_MODE=false` de forma **gradual** (superfície por superfície), com testes e revisão de copy conforme plano do ADR-0001.
  - ⚠️ **Custo**: chamadas de IA consomem API paga (provedor LLM). Definir provedor/orçamento e usar `ai_usage_counter` já existente para rate-limit.
- [ ] **Notificação por email opt-in**: preferência p/ receber due/weekly por email (reusa jobs + novos mailers).

**Entregável:** email funcionando, push real, IA religada com guarda de custo.

---

## FASE 2 — Família / Contas compartilhadas 👨‍👩‍👧

Mudança estrutural de maior porte (auth + escopo de dados).

- [ ] Modelos: `Household` (família) + `HouseholdMembership` (papéis: owner/member) + `HouseholdInvitation`.
- [ ] Escopo de dados: `financial_records` e `financial_goals` compartilháveis no nível household (migração + camada de autorização; cuidar de dados legados por-usuário).
- [ ] Endpoints: criar/entrar/sair de família, convites (por email — depende da Fase 1), listagem compartilhada, permissões.
- [ ] Mobile: telas de família, convites, visões compartilhadas, indicador de "de quem é o lançamento".
- [ ] Testes de autorização (usuário não pode ver dados de outra família).

**Entregável:** múltiplos usuários compartilhando uma conta financeira com segurança.

---

## FASE 3 — WhatsApp 💬 (pago/regulado)

- [ ] **Decisão de provedor**: Meta WhatsApp Cloud API (oficial, precisa Business/verificação), Twilio (mais simples, pago), ou não-oficial (Z-API/Evolution — risco de ban). Recomendação inicial: Cloud API oficial p/ produção.
- [ ] Abstração de canal de notificação (`NotificationChannel`: in-app / push / email / whatsapp) para não duplicar lógica.
- [ ] Opt-in + verificação de número + templates aprovados (HSM) para lembretes de vencimento.

**Entregável:** lembretes de vencimento e resumos via WhatsApp (opt-in).

---

## FASE 4 — Integração bancária / auto-registro 🏦 (pago/regulado)

- [ ] **Decisão de agregador**: Pluggy (BR, mais comum, sandbox grátis) / Belvo / Open Finance direto. Produção exige CNPJ + adesão regulatória.
- [ ] Conexão de contas (widget/link), sincronização de transações.
- [ ] Pipeline: transação importada → `financial_record` automático → **categorização via IA** (reusa `ai/categorize_record` já existente) → deduplicação vs lançamento manual.
- [ ] Mobile: conectar banco, revisar/confirmar importações, conciliação.

**Entregável:** lançamentos criados automaticamente a partir do extrato bancário.

---

## Dependências / ordem

```
FASE 0 (bugs) ──► FASE 1 (email, push, IA)
                      │
                      ├──► FASE 2 (família)   [usa email p/ convites]
                      ├──► FASE 3 (whatsapp)  [usa canal de notificação]
                      └──► FASE 4 (banco)     [usa IA de categorização]
```

## Riscos / decisões pendentes
- **Custo de IA** (Fase 1): definir provedor LLM e orçamento.
- **WhatsApp** (Fase 3): provedor + custo + verificação Business.
- **Open Finance** (Fase 4): agregador + CNPJ + adesão regulatória.
- **Setup de teste do backend**: `bin/rails test` não rodou de forma estável localmente (conflito de porta 5432 + paralelismo Rails 8). Estabilizar Postgres de teste/CI antes de confiar na suíte.
