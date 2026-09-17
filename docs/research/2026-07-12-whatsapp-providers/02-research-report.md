# Provider Comparison — WhatsApp Business API

## Tabela Comparativa

| Critério | Meta Cloud API (via BSP) | Twilio | Z-API |
|----------|------------------------|--------|-------|
| **Modelo** | API oficial WhatsApp | API oficial WhatsApp | API não-oficial (WhatsApp Web) |
| **Custo/mês (15k msgs utility)** | ~R$ 600-1.500 | ~US$ 150-300 (~R$ 800-1.700) | ~R$ 200-500 |
| **Setup** | Médio (precisa BSP + verificação) | Médio (verificação Business) | Simples (API Key + Instance) |
| **Rate Limit** | 80 msg/s (escalável) | 1 msg/s por template, 80/s total | ~5 msg/s (plano médio) |
| **Limite diário** | 1k/dia inicial, escala | 1k/dia inicial, escala | 500-5k/dia (plano) |
| **Compliance Meta** | ✅ Official Partner | ✅ Official Partner | ❌ Não-oficial |
| **Risco de bloqueio** | Baixo (segue políticas) | Baixo (segue políticas) | **Alto** (pode ser bloqueado) |
| **Qualidade (templates)** | ✅ HSM obrigatório | ✅ HSM obrigatório | ❌ Pode enviar sem template |
| **Webhook** | Nativo | Nativo | Nativo (mas instável) |
| **Suporte BR** | BSPs brasileiros | Suporte global em PT | Suporte BR excelente |
| **SMS fallback** | ❌ Não nativo | ✅ Nativo | ❌ Não |
| **Docs** | Ótimas (oficiais) | Ótimas | Boas (em PT-BR) |

## Análise Detalhada

### Meta Cloud API (via BSP — Zenvia / WhatsAppNow)
- **Prós:** API oficial, menor risco de bloqueio, qualidade de entrega superior, escalabilidade, templates HSM aprovados pelo WhatsApp, suporte BSP local
- **Contras:** Precisa de conta Business Meta verificada, processo de onboarding mais lento, custo mais alto, dependência de BSP
- **Ideal para:** Produção — app financeiro com notificações transacionais

### Twilio
- **Prós:** API oficial, documentação excelente, SMS fallback nativo, boa escalabilidade, múltiplos canais
- **Contras:** Precisa de verificação Business, custo em dólar (sujeito a câmbio), suporte BR limitado
- **Ideal para:** Se precisar de SMS como fallback + WhatsApp no mesmo provider

### Z-API
- **Prós:** Mais simples de configurar, mais barato, docs em português, sem verificação Business
- **Contras:** **Não-oficial** — usa WhatsApp Web (alto risco de bloqueio), rate limits baixos, sem garantia de compliance
- **Ideal para:** MVP/POC rápido, mas NÃO recomendado para produção com dados financeiros
