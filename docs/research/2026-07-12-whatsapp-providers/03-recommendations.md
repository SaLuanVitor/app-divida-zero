# Recomendação Final

## ✅ Meta Cloud API via BSP Brasileiro

**Provider escolhido:** Meta Cloud API (via **WhatsAppNow** ou **Zenvia**) + WhatsApp Business API oficial.

### Justificativa

1. **Menor risco de bloqueio** — App Dívida Zero lida com dados financeiros. Usar API não-oficial (Z-API) expõe o negócio a bloqueio permanente do WhatsApp, o que seria catastrófico.

2. **Qualidade de entrega** — Mensagens via API oficial têm maior taxa de entrega e suporte a templates HSM aprovados, essenciais para notificações utility.

3. **Escalabilidade** — Rate limits de 80 msg/s são mais que suficientes para o volume atual e futuro.

4. **Custo justificável** — ~R$ 600-1.500/mês para 15k mensagens é aceitável para um app financeiro com usuários ativos.

5. **Suporte local** — BSPs brasileiros oferecem suporte em português e ajudam com verificação Business e aprovação de templates.

### Plano de Ação (FASE-3a.1)

1. Criar conta Business Meta (se não existir)
2. Escolher BSP (WhatsAppNow recomendado por menor custo de setup)
3. Configurar webhook no Cloudflare Tunnel existente
4. Criar adapter `WhatsappProvider::MetaCloudAdapter`
5. Criar templates HSM: `due_reminder`, `weekly_summary`, `overdue_alert`
6. Testar envio real

### Fallback

Se verificação Business Meta demorar > 2 semanas, usar **Z-API como POC temporária** e migrar para Meta Cloud API assim que aprovado.
