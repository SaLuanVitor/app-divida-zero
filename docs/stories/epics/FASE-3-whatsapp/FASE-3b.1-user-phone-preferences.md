## [FASE-3b.1] User Phone + WhatsApp Preferences

**Description:** Adicionar campos `phone`, `phone_verified`, `wa_opt_in_at`, `wa_notification_preferences` (JSONB) no User. Criar endpoints de gerenciamento de preferências WA. Seguir padrão de `push_preferences` / `email_notification_preferences`.

**Acceptance Criteria:**
- [x] Migration: add `phone` (string, unique), `phone_verified` (boolean, default false), `wa_opt_in_at` (datetime) ao users
- [x] Migration: add `wa_notification_preferences` (jsonb, default `{}`, null false) ao users
- [x] Model User: `WA_PREFERENCE_DEFAULTS`, `wa_preferences_with_defaults`, `update_wa_preferences!`, `wa_enabled_for_alert?`
- [x] `WA_PREFERENCE_DEFAULTS` = `{ wa_notifications_enabled: false, wa_due_reminders: true, wa_weekly_summary: true }`
- [x] Endpoint `PATCH /api/v1/auth/whatsapp_notifications` (mesmo padrão de email_notifications)
- [x] `me` endpoint retorna `wa_preferences`
- [x] NÃO enviar WA sem `wa_notifications_enabled == true` (validação no model)
- [ ] Testes de autorização e persistência

**Technical Notes:**
- Seguir EXATAMENTE o padrão de `push_preferences` / `email_notification_preferences` no User model
- `phone` deve ser unique (validação no model)
- Opt-in default false (GDPR/WhatsApp compliance)

**Dependencies:** FASE-3a.2 (ApplicationChannel)
**Complexity:** P (migration + model + endpoint — padrão já existe)
**Risks:** Baixo — padrão já estabelecido com push/email

**Files:**
- `db/migrate/*_add_whatsapp_fields_to_users.rb`
- `app/models/user.rb` (métodos wa_*)
- `app/controllers/api/v1/auth_controller.rb` (update_wa_notifications)
- `config/routes.rb`
- `test/models/user_test.rb`
- `test/controllers/api/v1/auth_controller_test.rb`
