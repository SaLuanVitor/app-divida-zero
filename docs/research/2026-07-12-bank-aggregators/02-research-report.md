# Provider Comparison — Bank Aggregation Brazil

## Tabela Comparativa

| Critério | Pluggy | Belvo | Open Finance Direto |
|----------|--------|-------|---------------------|
| **Modelo** | Aggregator + OF | Aggregator + OF | Direct API (via Bacen) |
| **Cobertura BR** | 100+ instituições (todos grandes + digitais) | 80+ instituições | 700+ participantes OF |
| **Pricing** | R$2.500/mês Basic (conexões ilimitadas) | $1.000/mês Launch (100 conexões) | Gratuito (integração direta) |
| **Open Finance** | ✅ ITP-licensed, conexão OF automática | ✅ ITP-licensed | ✅ Direto via Bacen |
| **Pix** | ✅ Completo (contraparte >90%) | ✅ Completo | ✅ Completo |
| **Boleto** | ✅ Boleto Management API | Limitado | ❌ Não |
| **Cartão de Crédito** | ✅ Completo (fatura, transações) | ✅ Completo | Parcial |
| **Investimentos** | ✅ CDB, ações, fundos | Parcial (Renda Fixa) | ❌ |
| **Webhook** | ✅ Nativo (transações, status) | ✅ Nativo | ❌ (precisa polling) |
| **SDK** | Python, JS, Java, .NET | Python, JS, Java | N/A (REST direto) |
| **Rate Limits** | 10 req/s (Basic), 30 req/s (Pro) | 5 req/s (Launch) | Variável por instituição |
| **Setup** | 1-2 semanas (API key + sandbox) | 1-2 semanas | 2-4 meses (certificação + homologação) |
| **CNPJ necessário?** | Sim (pessoa jurídica) | Sim | Sim + certificação Bacen |
| **LGPD compliance** | ✅ | ✅ | ✅ |
| **Suporte BR** | ✅ Excelente (time BR) | ✅ Bom (time LATAM) | ⬜ Documentação Bacen |
| **Trial** | 14 dias grátis + sandbox | 14 dias grátis | N/A |

## Recomendação

**Pluggy** para app-divida-zero:
1. **Maior cobertura** bancária brasileira (Nubank, Itaú, Bradesco, Santander, Caixa, Inter, C6, BTG, XP)
2. **Melhor custo** para BR-only (R$2.500/mês conexões ilimitadas)
3. **ITP-licensed** pela Bacen — conformidade regulatória
4. **Rico em features BR** — Pix, Boleto API, investimentos
5. **Webhook nativo** — ideal para Solid Queue + jobs

## Riscos

- Custo mensal recorrente (R$2.500/mês) — precisa justificar ROI
- Dependência de terceiro para core feature
- Open Finance direto seria gratuito mas complexidade de certificação é proibitiva
