# FASE 0 — Higienização 🩹

> Corrigir inconsistências antes de qualquer feature nova.
> Baseado em `docs/PLANO-EVOLUCAO.md`.

Data: 2026-07-10 · Owner: SaLuanVitor · Orquestração: @aiox-master (Orion)

---

## Acceptance Criteria

- [x] **Baseline de qualidade**: `npm run typecheck` ✅, tests mobile 68/68 ✅
- [x] **Bug overlay (z-index)**: corrigido via `AppOverlay`/`AppToast` (commit `9d813eb`)
- [x] **Catálogo de inconsistências**: auditoria automatizada — 25+ itens encontrados (8 corrigidos nesta sprint)
- [x] **Corrigir inconsistências priorizadas**
- [x] **Testes para correções**: 68/68 testes passam, typecheck limpo

---

## Corrigido nesta sprint

### Segurança (backend)
- **Demo seed**: agora só roda com `DEMO_SEED_ENABLED=true` (não mais automático em produção)
- **CORS**: restrito a origens configuradas via `CORS_ALLOWED_ORIGINS` (fallback localhost)
- **`.gitignore`**: padrão `.env*` corrigido para ignorar em subdiretórios

### Logging/observability (backend)
- **`GenerateDailyAiMessageJob`**: erro logado antes do fallback
- **`ExpoPushService`**: erro logado em vez de silencioso

### Logging/observability (mobile)
- **`notifications.ts`**: push token registration e channel setup agora logam warning em dev
- **`NotificationHistory.tsx`**: markAsSeen falha logada em dev

### Tipagem (mobile)
- **`User` type**: `created_at` adicionado
- **`Profile.tsx`**: `as any` removido

---

## Arquivos alterados

### Backend
- `config/initializers/demo_seed.rb` — ✅ gate por env var
- `config/initializers/cors.rb` — ✅ origins configurável
- `app/jobs/generate_daily_ai_message_job.rb` — ✅ log no rescue
- `app/services/expo_push_service.rb` — ✅ log no rescue
- `.gitignore` — ✅ padrão `.env*` sem `^/`

### Mobile
- `src/types/auth.ts` — ✅ `created_at` adicionado
- `src/screens/app/Profile.tsx` — ✅ `as any` removido
- `src/services/notifications.ts` — ✅ logging em catch blocks
- `src/screens/app/NotificationHistory.tsx` — ✅ logging em catch block

---

## Não corrigido (baixo risco / decisão adiada)

- `any` type proliferation (44 usos) — refactor grande, baixo risco atual
- N+1 queries em `notification_alerts_service.rb` e `reports_controller.rb` — performance, não blocker
- `force_ssl`/`assume_ssl` comentado — depende do setup Railway
- Rate limiting auth — feature, não bug
- Race condition `DeviceToken` upsert — borda, baixa probabilidade
- i18n — escopo grande demais para Fase 0
