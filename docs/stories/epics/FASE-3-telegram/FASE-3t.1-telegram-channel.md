# Story FASE-3t.1 — TelegramChannel: canal de notificação transacional via Telegram Bot API

## Status
Done

## Story
**As a** usuário do App Dívida Zero,
**I want** receber lembretes de vencimento e resumo semanal pelo Telegram,
**so that** eu tenha notificação transacional gratuita, sem depender de WhatsApp (pago/regulado) nem de e-mail próprio.

## Contexto e Decisão
- O WhatsApp foi **abandonado** como canal (exige verificação Business + templates HSM + cobrança por conversa). Decisão registrada em `docs/adr/ADR-0003-telegram-sem-whatsapp-sem-email.md`.
- O Telegram Bot API é **gratuito**, sem templates, com mensagem livre após o usuário iniciar o chat (`/start`). Limites: ~1 msg/s por chat, ~30 msg/s em broadcast.
- O e-mail/sMTP fica **fora de escopo** por ora (ADR-0003).
- Reaproveitar a abstração `ApplicationChannel` já existente (`EmailChannel`, `PushChannel`, `WhatsappChannel`), o `NotificationAlertsService` e o Solid Queue.

## Acceptance Criteria
1. [x] `TelegramProvider` criado com `configured?`, `send_message(chat_id:, text:)` e `verify_credentials!`, lendo `TELEGRAM_BOT_TOKEN` do env (`app/services/telegram_provider.rb`).
2. [x] `TelegramChannel < ApplicationChannel` implementado (`channel_name`, `deliver`, `valid_recipient?`, skip sem provider) em `app/channels/telegram_channel.rb`.
3. [x] Model `User` com `telegram_chat_id`, `telegram_username`, `telegram_opt_in_at`, `telegram_notification_preferences` + `TELEGRAM_PREFERENCE_DEFAULTS`, `telegram_preferences_with_defaults`, `update_telegram_preferences!`, `telegram_enabled_for_alert?`.
4. [x] `TelegramDispatchJob` (fila `default`, skip quando alert/user inválidos).
5. [x] `NotificationAlertsService#create_alert_once!` enfileira `TelegramDispatchJob.perform_later(alert.id) if TelegramProvider.configured?`.
6. [x] Opt-in: `POST /api/v1/auth/telegram/link` (`chat_id` + `auth_token` via `TelegramLinkToken` HMAC, expiração 30 min) + deep link `GET /api/v1/auth/telegram/link_url`.
7. [x] `PATCH /api/v1/auth/telegram_notifications` + `me` retorna `telegram_preferences` e `telegram_linked`.
8. [x] `TELEGRAM_BOT_TOKEN` e `TELEGRAM_BOT_USERNAME` no `.env.example`.
9. [x] Testes: `telegram_provider_test`, `telegram_channel_test`, `telegram_dispatch_job_test`, `user_telegram_test`, `auth_telegram_test` (24 testes).

## Tarefas / Subtasks
- [ ] Criar `TelegramProvider` com cliente HTTP (Net::HTTP ou Faraday, sem gem nova se possível) e tratamento de 429/erro (AC #1)
- [ ] Criar `TelegramChannel` (AC #2)
- [ ] Migration `add_telegram_fields_to_users` (AC #3)
- [ ] Métodos `telegram_*` no `User` (AC #3)
- [ ] `TelegramDispatchJob` (AC #4)
- [ ] Ligar no `NotificationAlertsService` (AC #5)
- [ ] Fluxo de deep link: `TelegramLinkToken` (token assinado, expiração) + endpoint `auth/telegram/link` (AC #6)
- [ ] `PATCH auth/telegram_notifications` + `me` (AC #7)
- [ ] `.env.example` (AC #8)
- [ ] Testes unitários + controller (AC #9)

## Dev Notes

### Source Tree relevante
```
app/
├── services/
│   └── telegram_provider.rb            # NOVO - envia via Bot API
├── channels/
│   ├── application_channel.rb          # base existente (DeliverResult)
│   ├── email_channel.rb                # referência de canal simples
│   ├── push_channel.rb                 # referência de canal simples
│   ├── whatsapp_channel.rb             # referência de skip-quando-não-configurado
│   └── telegram_channel.rb             # NOVO
├── jobs/
│   ├── email_dispatch_job.rb           # referência de job simples
│   └── telegram_dispatch_job.rb        # NOVO
├── models/
│   └── user.rb                         # + telegram_* preferences/validations
├── controllers/api/v1/
│   └── auth_controller.rb              # + link + update_telegram_notifications
config/
├── routes.rb                           # + auth/telegram/*
└── recurring.yml / queue.yml           # (job vai na fila default, sem agendar)
db/migrate/*_add_telegram_fields_to_users.rb
test/
├── services/telegram_provider_test.rb
├── channels/telegram_channel_test.rb
├── jobs/telegram_dispatch_job_test.rb
├── models/user_telegram_test.rb
└── controllers/api/v1/auth_telegram_test.rb
```

### Referência da mensagem (`deliver`)
```ruby
text = [alert.title, alert.message].compact.join("\n")
TelegramProvider.send_message(chat_id: user.telegram_chat_id, text: text)
```

### Deep link / opt-in (AC #6)
1. Mobile gera `auth_token` curto (HMAC sobre `user_id` + expiração), assinado com `SECRET_KEY_BASE`.
2. Abre `https://t.me/<BOT_USERNAME>?start=<auth_token>`.
3. O bot (ou um webhook opcional) devolve o `chat_id`; o mobile então chama `POST auth/telegram/link` com `chat_id` + `auth_token`.
4. Backend valida o token e grava o vínculo. (A entrega das mensagens proativas só funciona após esse vínculo.)

### Observações
- NÃO implementar credenciais reais nesta story: o `TelegramProvider` lê env, e os testes usam mock.
- Seguir exatamente o padrão de `push`/`email`/`wa` para preferências (default desligado).
- Manter `WhatsappChannel`/`WhatsappProvider` preservados por compatibilidade (sem remoção — ADR-0003), apenas o Telegram passa a ser o canal ativo de mensageria.

## Dependencies
- `ApplicationChannel` (já existe)
- `NotificationAlertsService` (já existe)
- `JsonWebToken`/`SECRET_KEY_BASE` (já existem, para o token de link)

## Complexity
M (provider + channel + migration + job + endpoints, padrões todos já estabelecidos)

## Risks
- **Baixo**: todos os padrões (canal, job, preferências) já existem para email/push/wa.
- **Onboarding**: o usuário precisa ter o Telegram e apertar `/start` antes de receber a 1ª mensagem (limitação do canal, documentada no ADR-0003).
