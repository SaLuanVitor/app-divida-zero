# App Dívida Zero

Aplicativo de controle financeiro pessoal e familiar, com importação manual de extratos bancários (OFX/CSV), notificações transacionais via Telegram e contas compartilhadas (família).

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Ruby on Rails 8.1 (API) + PostgreSQL 16, em Docker |
| Mobile | React Native (Expo) + TypeScript |
| Notificação | Telegram Bot API (canal ativo) |
| Integração bancária | Importação manual OFX/CSV (ativo) · auto-sync via agregador congelado (ADR-0003) |

## Estado atual

- Fase 5 (segurança) e Fase 6 (polish de UI) concluídas.
- Telegram ativo como canal transacional, com vínculo por usuário via deep link (`/start`).
- Contas família (households) ativas.
- Importação manual OFX/CSV ativa; auto-sync Pluggy gated off via feature flag.

## Estrutura do repositório

- `backend/`: API Rails (`backend/api_divida_zero`)
- `mobile/`: App React Native (Expo)
- `docs/`: stories, ADRs e guias
- `scripts/`: scripts de apoio (charset etc.)

## Pré-requisitos

- Docker Desktop ativo
- Node.js + npm instalados
- Emulador Android ou device físico

## Como rodar

### Backend + banco (Docker)

```powershell
cd E:\Projetos\aiox\Projetos\app-divida-zero
docker compose up --build -d
curl.exe -i http://localhost:3000/up
```

Serviços: `api-prod` (3000), `api-dev` (3001), `db` (Postgres 16). O compose usa `db:prepare` (preserva dados no restart). Não usar `db:schema:load`.

### Mobile

```powershell
cd E:\Projetos\aiox\Projetos\app-divida-zero\mobile
npm install
npx expo start --android
```

### Túnel público (Cloudflare)

```powershell
cloudflared tunnel --config "$env:USERPROFILE\.cloudflared\config.yml" run divida-zero
```

API pública: `https://api.dividazeropa.sbs/api/v1`. O mobile aponta para esse domínio via `mobile/.env` (`EXPO_PUBLIC_API_URL`).

## Testes

Backend: rode dentro do container, **1 arquivo por vez** (a suíte completa em paralelo segfaulta):

```powershell
docker compose exec api bash -lc "RAILS_ENV=test bundle exec rails db:prepare && bundle exec rails test test/controllers/api/v1/auth_controller_test.rb"
```

Mobile:

```powershell
cd mobile
npx tsc --noEmit
npm run test -- --runInBand
```

## Charset (UTF-8)

Todo texto do projeto deve permanecer em UTF-8. Validar:

```powershell
node .\scripts\check-mojibake.js
```

## Feature flags

| Flag | Default | Descrição |
|------|---------|-----------|
| `open_finance` | off | Integração Open Finance via Pluggy (congelado, ADR-0003) |
| `bank_sync` | off | Sincronização bancária automática |
| `manual_import` | on | Importação manual OFX/CSV |
| `family` | on | Funcionalidades de família |
| `ai_analysis` | on | Análise por IA de transações |

## Importação bancária

Caminho ativo: **importação manual OFX/CSV** (Fase 4a).

```
POST   /api/v1/bank/statements/upload        # envia OFX/CSV, retorna batch_id
GET    /api/v1/bank/statements/:batch_id/status  # progresso do parsing
DELETE /api/v1/bank/statements/:batch_id     # exclui lote (LGPD)
GET    /api/v1/bank/transactions/pending     # transações pendentes/duplicadas
POST   /api/v1/bank/transactions/accept      # aceita selecionadas e cria FinancialRecord
POST   /api/v1/bank/transactions/reject      # rejeita selecionadas
POST   /api/v1/bank/transactions/:id/merge   # mescla duplicata em registro existente
```

O auto-sync via Pluggy (`/api/v1/financial/connections`) está implementado mas **congelado**: os flags `open_finance` e `bank_sync` ficam off.

## Decisões de arquitetura

- `docs/adr/ADR-0003`: Telegram no lugar do WhatsApp; e-mail/SMTP fora de escopo; sync bancário congelado no manual OFX/CSV.

## Notificações (Telegram)

- Bot: `@appDividaZeroBot`
- Webhook: `https://api.dividazeropa.sbs/api/v1/telegram/webhook`
- Vínculo por usuário: o usuário abre `https://t.me/<bot>?start=<token>` e confirma na tela de settings.
