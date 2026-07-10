# Fase 1 — Design técnico (reativar o existente: email, push, IA)

> Complementa `PLANO-EVOLUCAO.md`. Foco: features **grátis/simples** em cima do que já existe.
> Executar com @dev (Sonnet); planejamento por @aiox-master (Opus). Data: 2026-07-10.

Achado-chave do diagnóstico: **muita coisa já está pronta**, só falta o "último fio":
- Agendador `recurring.yml` já roda jobs de alerta (diário 7h, vencimentos a cada 6h, semanal sex 9h) → `NotificationAlertsService` cria alertas **in-app**. Falta **entregar** (push/email).
- Reset de senha gera token, mas **não envia email** (em prod o usuário nunca recebe → fluxo quebrado). Falta o **mailer**.
- IA server-side já chama **OpenAI `gpt-4.1-mini`** (`Ai::Client`, `ENV["OPENAI_API_KEY"]`) com fallback canned e `usage_guard`. Falta **key + religar a UI mobile**.

---

## 1) Email real (SMTP) 📧

**Estado atual:** `ApplicationMailer` vazio, `action_mailer.smtp_settings` comentado em `config/environments/production.rb`, `default_url_options host: example.com`. `forgot_password` grava `reset_password_token_digest` mas só devolve o token em dev (`dev_reset_token`). **Em produção o reset é inutilizável.**

**Desenho:**
- Provedor SMTP com free tier e boa entregabilidade. Recomendação: **Resend** (100 emails/dia grátis, API/SMTP simples) ou **Brevo** (300/dia). Gmail SMTP serve para testes, não para produção.
- Config via ENV/credentials (nunca hardcode): `SMTP_ADDRESS`, `SMTP_PORT`, `SMTP_USER_NAME`, `SMTP_PASSWORD`, `MAILER_DEFAULT_HOST`, `MAILER_FROM`.
- Habilitar entrega em produção: `config.action_mailer.delivery_method = :smtp`, `perform_deliveries = true`, `raise_delivery_errors = true`, `default_url_options = { host: ENV["MAILER_DEFAULT_HOST"] }`.

**Tarefas:**
- [ ] `PasswordResetMailer#reset_email(user, raw_token)` — corpo com link/token e validade de 30min. Views html+text.
- [ ] Ligar em `AuthController#forgot_password`: enviar o email quando `user` existe. Manter `dev_reset_token` **só** em dev/test (não vazar em prod).
- [ ] `WelcomeMailer#welcome(user)` — enviado no `register` (async via `deliver_later` → solid_queue).
- [ ] `ApplicationMailer`: `default from: ENV["MAILER_FROM"]`, layout.
- [ ] (Opcional) alerta de vencimento/semanal por email — opt-in em preferências, disparado junto dos jobs (ver seção 2).
- [ ] Teste de mailer (`test/mailers/`) + envio real de verificação em staging.

**Arquivos:** `app/mailers/*`, `app/views/*_mailer/*`, `config/environments/production.rb`, `app/controllers/api/v1/auth_controller.rb`.

---

## 2) Push notifications real (Expo Push API — grátis) 🔔

**Estado atual:** mobile agenda notificações **locais** (`expo-notifications`) no device. Jobs backend criam alertas **in-app** (`NotificationAlert`, lidos via `GET /notifications/history`). **Não há push remoto** nem registro de token.

**⚠️ Pré-requisito:** Expo Push exige um **projeto EAS** (`app.json` → `extra.eas.projectId`). Hoje **não há** projectId configurado. Passo zero: `eas init` / configurar projectId (gratuito, conta Expo).

**Desenho (server dispara via Expo Push API):**
- Modelo `DeviceToken` (`user_id`, `expo_push_token` único, `platform`, `last_seen_at`). Migration.
- Endpoints: `POST /api/v1/devices` (upsert token do usuário logado), `DELETE /api/v1/devices` (logout/opt-out).
- `ExpoPushService.deliver(tokens, title, body, data)` → `POST https://exp.host/--/api/v2/push/send` (batches de 100, trata `DeviceNotRegistered` removendo token morto).
- Entrega: novo `PushDispatchJob` (ou hook em `NotificationAlertsService`) — após criar um alerta, envia push para os `DeviceToken` do usuário, **respeitando as preferências já existentes** (`notifications_enabled`, `device_push_enabled`, `notify_due_today/tomorrow/weekly`).

**Mobile:**
- Após permissão concedida (fluxo `ensurePostLoginNotificationPermission` já existe), obter `getExpoPushTokenAsync({ projectId })` e enviar para `POST /devices`.
- Remover token no logout.
- Manter as notificações locais como fallback; push remoto passa a ser a fonte primária quando disponível.

**Arquivos:** nova migration + `app/models/device_token.rb`, `app/controllers/api/v1/devices_controller.rb`, `app/services/expo_push_service.rb`, `app/jobs/push_dispatch_job.rb`, `config/routes.rb`; mobile `src/services/notifications.ts` + `api.ts` (registro), `app.json` (projectId).

---

## 3) Religar IA (gradual) 🤖

**Estado atual:** mobile esconde IA via `EXPO_PUBLIC_PHASE_1_MODE=true` ([featurePhase.ts]). Backend `Ai::Client` chama **OpenAI `gpt-4.1-mini`** se `OPENAI_API_KEY` presente; senão fallback canned. `Ai::UsageGuard` + modelo `ai_usage_counter` já existem para limitar custo.

**Desenho (provedor: OpenRouter free, via endpoint compatível OpenAI):**
- [ ] **Parametrizar `Ai::Client`**: hoje a URL da OpenAI é fixa (`https://api.openai.com/v1/chat/completions`, `ENV["OPENAI_API_KEY"]`, `DEFAULT_MODEL=gpt-4.1-mini`). Introduzir `ENV["AI_BASE_URL"]` (default OpenAI p/ retrocompat), `ENV["AI_API_KEY"]`, `ENV["AI_MODEL"]`. Para OpenRouter: `AI_BASE_URL=https://openrouter.ai/api/v1`, `AI_MODEL=meta-llama/llama-3.3-70b-instruct:free` (ou outro `:free`), header opcional `HTTP-Referer`/`X-Title`. Refactor pequeno e seguro, com teste.
- [ ] Setar `AI_API_KEY` (key grátis do OpenRouter) no ambiente de produção (Railway). **Custo zero** dentro do free tier; `UsageGuard` mantém o teto.
- [ ] Reativação **gradual** por superfície (conforme ADR-0001), uma de cada vez, com revisão de copy/UX:
  1. `daily_message` (mensagem diária) → 2. `next_action` → 3. `alerts` → 4. `reports_briefing` → 5. `categorize_record` (esta última é a base do auto-registro da Fase 4).
- [ ] Em vez de flipar `PHASE_1_MODE` global de uma vez, considerar flags por-superfície (estender `featurePhase.ts`) para rollout controlado.
- [ ] Rodar bateria de testes + checklist manual Android (`docs/qa/`) antes de liberar.

**Arquivos:** `mobile/src/config/featurePhase.ts` (+ consumidores), env de produção; `Ai::UsageGuard` (revisar limites).

---

## Sequência sugerida da Fase 1
```
1. Email (conserta reset quebrado — maior valor imediato, menor risco)
2. Push (depende de EAS projectId; reusa jobs/preferências)
3. IA (depende de key + orçamento; rollout gradual)
```

## Decisões TRAVADAS (2026-07-10)
1. **Email → Resend** ✅. Verificar se envia de domínio próprio ou subdomínio do Resend (definir `MAILER_FROM`).
2. **IA → OpenRouter (free)** ✅. Usar modelo `:free` (ex.: `meta-llama/llama-3.3-70b-instruct:free` ou `deepseek/deepseek-chat-v3-0324:free`), endpoint compatível OpenAI. Custo zero dentro do free tier; `UsageGuard` mantém o teto.
3. **Push → conta Expo disponível** ✅. Autorizado `eas init` para gerar `projectId`.
