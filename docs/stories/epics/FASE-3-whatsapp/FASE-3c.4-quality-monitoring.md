## [FASE-3c.4] Quality Score Monitoring + Admin Dashboard

**Description:** Implementar job de monitoramento de quality score do WhatsApp Business API. Criar dashboard admin para visualizar métricas de mensagens WA.

**Acceptance Criteria:**
- [ ] Job `WhatsappQualityMonitorJob` consulta quality score do provider (diário)
- [ ] Score armazenado em `WhatsAppMessage` (metadata) ou tabela de monitoramento
- [ ] Alerta se quality score cair abaixo de 70% (notificação admin)
- [ ] Dashboard admin básico: total de msgs/dia, sucesso/falha, delivery rate, opt-in rate
- [ ] Dashboard mostra histórico dos últimos 30 dias
- [ ] Testes do monitor job

**Technical Notes:**
- Meta quality score: green (≥90%), yellow (70-89%), red (<70%)
- Provider não-Meta pode não ter quality score — adaptar por provider
- Dashboard admin via controller existente `Api::V1::Admin`
- Dados do dashboard: aggregation em `WhatsAppMessage` por created_at e status

**Dependencies:** FASE-3c.2 (dispatch), FASE-3c.3 (bridge)
**Complexity:** M (job monitor + dashboard)
**Risks:** Provider pode não expor quality score via API

**Files:**
- `app/jobs/whatsapp_quality_monitor_job.rb`
- `app/controllers/api/v1/admin/whatsapp_dashboard_controller.rb`
- `config/routes.rb`
- `config/recurring.yml`
- `test/jobs/whatsapp_quality_monitor_job_test.rb`
