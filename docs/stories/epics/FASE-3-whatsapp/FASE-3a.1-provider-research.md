## [FASE-3a.1] Provider Research and POC

**Description:** Pesquisar e comparar provedores WhatsApp Business API (Z-API, Twilio, Meta Cloud API), executar POC com o escolhido, documentar decisão final.

**Acceptance Criteria:**
- [ ] Pesquisa comparativa com tabela de 11 critérios (custo, rate limit, compliance, docs, suporte BR)
- [ ] POC funcional com o provedor escolhido (enviar mensagem template real)
- [ ] Documento de decisão salvo em `docs/research/YYYY-MM-DD-whatsapp-providers/`
- [ ] Provider SDK/adapter base integrado ao projeto
- [ ] `WHATSAPP_PROVIDER`, `WHATSAPP_API_KEY`, `WHATSAPP_PHONE_ID` no `.env.example`
- [ ] Teste de envio real documentado com print/log

**Technical Notes:**
- Provider-agnostic: criar adapter base `WhatsappProvider` que encapsula SDK
- POC deve testar: envio de template, status callback (webhook), rate limit headers, tratamento de 429
- Usar webhook tunneling (Cloudflare Tunnel já existente) para receber callbacks do provider
- Criar adapter para o provider escolhido APENAS (outros ficam como stub)

**Dependencies:** Nenhuma (primeira story)
**Complexity:** M (Spike + POC)
**Risks:** Provider pode ter docs fracas ou exigir verificação business demorada

**Files:**
- `docs/research/YYYY-MM-DD-whatsapp-providers/`
- `app/services/whatsapp_provider.rb`
- `app/services/whatsapp_provider/<provider>_adapter.rb`
- `.env.example`
