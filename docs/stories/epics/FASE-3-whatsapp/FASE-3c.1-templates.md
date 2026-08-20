## [FASE-3c.1] WhatsAppTemplate Model + HSM Templates

**Description:** Criar modelo `WhatsAppTemplate` para cache local dos templates HSM aprovados. Criar templates `due_reminder`, `weekly_summary`, `overdue_alert` no provedor.

**Acceptance Criteria:**
- [ ] Migration: criar `whatsapp_templates` (provider_template_id, name, language, components, status, last_synced_at)
- [ ] Model `WhatsAppTemplate` com validações e scopes por status
- [ ] Templates HSM criados no provedor: `due_reminder`, `weekly_summary`, `overdue_alert`
- [ ] Job `WhatsappTemplateSyncJob` para sincronizar templates do provider (agendado via recurring.yml)
- [ ] Fallback: se template não estiver aprovado, não enviar WA (loga warning)
- [ ] Testes de model, sync, template validation

**Technical Notes:**
- Template `due_reminder`: corpo com `{{1}}` = nome, `{{2}}` = valor, `{{3}}` = data
- Template `weekly_summary`: corpo com `{{1}}` = nome, `{{2}}` = entradas, `{{3}}` = saídas, `{{4}}` = saldo
- Template `overdue_alert`: corpo com `{{1}}` = nome, `{{2}}` = dias atraso, `{{3}}` = valor
- Sincronizar diariamente via recurring.yml

**Dependencies:** FASE-3a.1 (provider adapter), FASE-3b.4 (tracking model)
**Complexity:** P (model + sync job)
**Risks:** Template pode ser rejeitado pelo WhatsApp — processo manual de revisão

**Files:**
- `db/migrate/*_create_whatsapp_templates.rb`
- `app/models/whatsapp_template.rb`
- `app/jobs/whatsapp_template_sync_job.rb`
- `config/recurring.yml`
- `test/models/whatsapp_template_test.rb`
