# PRD — Subfase 4a1: Importação de Extratos Bancários (OFX/CSV)

> **Produto:** App Dívida Zero
> **Fase:** 4 — Integração Bancária
> **Subfase:** 4a1 — Upload + Parsing de Extratos
> **Autor:** Morgan (PM)
> **Data:** 2026-07-12
> **Prioridade:** Alta

---

## 1. Problem Statement

Hoje o usuário precisa **cadastrar manualmente** cada transação financeira no app. Para alguém com dezenas de movimentações por mês, isso é inviável — resultado: abandono do registro financeiro.

O app precisa de um mecanismo para **importar extratos bancários** automaticamente, permitindo que o usuário apenas revise e aceite.

---

## 2. Target Users

- Jovens adultos brasileiros (25–40 anos) que querem控制 financeiro
- Usuários de Nubank, Inter, C6, Itaú, Bradesco, Santander, Caixa
- Pessoas sem tempo para lançamento manual
- Perfil mobile-first, mas que usa internet banking pelo computador

---

## 3. User Journey

```
1. Usuário acessa internet banking
2. Exporta extrato do período (OFX ou CSV)
3. Abre o app Dívida Zero → "Importar Extrato"
4. Seleciona o arquivo
5. App faz upload → parsing → IA categoriza → dedup
6. Usuário vê transações pendentes organizadas
7. Revisa → aceita em lote → viram FinancialRecord
```

---

## 4. Functional Requirements (MoSCoW)

### MUST — Essencial para o MVP

| ID | Requisito | Descrição |
|:--:|-----------|-----------|
| FR01 | Upload OFX | Aceitar arquivos .ofx/.qfx, parsear transações |
| FR02 | Upload CSV | Aceitar arquivos .csv com detecção automática de colunas |
| FR03 | AI Categorization | Sugerir categoria e flow_type via Ai::Client |
| FR04 | Dedup automático | Detectar duplicatas contra FinancialRecord existentes |
| FR05 | Revisão manual | Lista de transações pendentes com preview |
| FR06 | Aceitar em lote | Usuário seleciona → aceita → vira FinancialRecord |
| FR07 | Rejeitar transações | Usuário pode rejeitar transações indesejadas |
| FR08 | Feedback de progresso | Barra de progresso durante upload + parsing |

### SHOULD — Importante, não crítico

| ID | Requisito | Descrição |
|:--:|-----------|-----------|
| FR09 | Merge duplicatas | Usuário pode forçar aceitar duplicata (mesclar) |
| FR10 | Guia por banco | Passo-a-passo de como exportar extrato em cada banco |
| FR11 | Detecção de banco | Identificar banco pelo formato do OFX/CSV |

### COULD — Diferencial

| ID | Requisito | Descrição |
|:--:|-----------|-----------|
| FR12 | Multi-formato | Suporte a QIF, JSON exportado |
| FR13 | Upload múltiplo | Vários arquivos de uma vez |

### WON'T — Fora do escopo agora

| ID | Requisito | Descrição |
|:--:|-----------|-----------|
| FR14 | Open Finance real-time | Futuro (Subfase 4b) |
| FR15 | Webhook bancário | Futuro |
| FR16 | Conciliação automática | Futuro |

---

## 5. Non-Functional Requirements

| ID | Requisito | Critério |
|:--:|-----------|----------|
| NFR01 | LGPD compliance | Dados brutos não retidos >30 dias; consentimento explícito |
| NFR02 | Performance | 100 transações processadas em <30s |
| NFR03 | Segurança | Senha bancária nunca trafega no app |
| NFR04 | Privacidade | Só transações, sem saldos ou dados cadastrais |
| NFR05 | Escalabilidade | Upload simultâneo de 50 usuários sem degradação |
| NFR06 | Confiabilidade | Rollback completo se parsing falhar (nenhuma transação parcial) |

---

## 6. User Flows

### Happy Path
```
Upload → Parsing OK → AI categoriza → Dedup (0 matches) → Pending → 
Usuário abre lista → Seleciona 10 → Aceita → 10 FinancialRecord criados → 
Gamificação + Goals atualizados
```

### Duplicate Path
```
Upload → Parsing OK → AI categoriza → Dedup (3 matches) → 
3 sinalizadas amarelo/vermelho → Usuário revisa → 
Força aceitar (merge) OU Rejeita as duplicatas
```

### Error Path
```
Upload → Formato inválido → Erro amigável + 
sugestão: "Exporte como OFX. Precisa de ajuda? Veja guia."
```

---

## 7. Acceptance Criteria

| ID | Critério | Testável? |
|:--:|----------|:---------:|
| AC-01 | Upload de OFX válido retorna lista de transações | Sim |
| AC-02 | Upload de CSV com colunas detectadas retorna lista | Sim |
| AC-03 | Formato inválido retorna erro com mensagem amigável | Sim |
| AC-04 | AI sugere categoria para cada transação | Sim |
| AC-05 | Duplicata exata (amount+date+description) detectada automaticamente | Sim |
| AC-06 | Aceitar lote de 5 transações cria 5 FinancialRecord | Sim |
| AC-07 | Rejeitar transação não cria FinancialRecord | Sim |
| AC-08 | Progresso visível durante parsing | Sim |
| AC-09 | Dados brutos do arquivo removidos após 30 dias | Sim |
| AC-10 | Upload simultâneo de 2 usuários não interfere | Sim |
| AC-11 | Rollback total se parsing falhar | Sim |
| AC-12 | Transação aceita dispara gamificação (XP + achievements) | Sim |
| AC-13 | Usuário pode desfazer aceitação em até 5 minutos | Sim |

---

## 8. Out of Scope

- ✗ Open Finance / conexão automática com banco
- ✗ Reconciliação bancária (confronto saldo)
- ✗ Importação recorrente automática (scheduling)
- ✗ Suporte a PDF (apenas OFX/CSV)
- ✗ Categorização personalizada por usuário (futuro)
- ✗ Integração com contabilidade / IR

---

## 9. Suggested Endpoints

| Method | Path | Descrição |
|:------:|------|-----------|
| POST | `/api/v1/bank/statements/upload` | Upload do arquivo, retorna `batch_id` |
| GET | `/api/v1/bank/statements/:batch_id/status` | Progresso do parsing |
| GET | `/api/v1/bank/transactions/pending` | Lista transações pendentes do usuário |
| POST | `/api/v1/bank/transactions/accept` | Aceitar lote (array de IDs) |
| POST | `/api/v1/bank/transactions/reject` | Rejeitar lote |
| POST | `/api/v1/bank/transactions/:id/merge` | Forçar aceitação de duplicata |

---

## 10. Success Metrics

- **% de transações aceitas sem edição manual** > 80%
- **Tempo médio upload → pronto para revisão** < 15s
- **Taxa de duplicatas falso-positivo** < 5%
- **NPS da funcionalidade** > 40 (após release)

---

— Morgan, planejando o futuro 📊
