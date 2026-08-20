# FASE 4 — Integração Bancária: Execução e Arquitetura

> **Fase:** 4 — Importação Extratos + Open Finance (futuro)
> **Owner:** SaLuanVitor · **Orquestração:** @aiox-master (Orion)
> **Provider:** Nenhum agregador pago. OFX/CSV manual agora → Open Finance direto (Bacen) no futuro.

---

## Visão Geral

### FASE 4a — Importação Manual OFX/CSV (agora, grátis)
Usuário exporta extrato bancário (OFX ou CSV) → upload → AI parseia transações → dedup com registros existentes → revisão → aceita → vira FinancialRecord.

### FASE 4b — Open Finance Direto (futuro, gratuito)
Certificação Bacen → conector Open Finance direto → mesmo pipeline de categorização e dedup.

---

## Pipeline de Importação (4a)

```
Upload OFX/CSV → FileUploadController
                      ↓
             StatementParseJob (fila: bank)
                      ↓
          StatementParsingService (OFX::Parser / CsvParser)
                      ↓
        [lista de transações brutas: {date, amount, description, type}]
                      ↓
            AiCategorizationService
         (reutiliza Ai::Client + PromptBuilder)
                      ↓
        [transações enriquecidas: +category, +flow_type, +confidence]
                      ↓
              DeduplicationService
         (compara com FinancialRecord existente:
          fuzzy match por amount + date + description)
                      ↓
        ImportedTransaction.create! (status: pending | duplicate)
                      ↓
         Usuário revisa em lote no mobile/web
                      ↓
        PATCH /bank/transactions/accept → FinancialRecord.create!
```

## Subfases Detalhadas

### Subfase 4a1 — Upload + Parsing
- [x] Modelo `ImportedTransaction` (dados brutos + status pending/duplicate/accepted/rejected)
- [x] Serviço `StatementParsingService` com strategy:
  - `OfxParser` (OFX/QFX via parser Ruby)
  - `CsvParser` (CSV com header detection)
  - extensível para OF direto no futuro
- [x] `POST /bank/statements/upload` (multipart, retorna job_id)
- [x] `GET /bank/statements/:id/status` (progress polling)
- [ ] Validação de formato + LGPD: dados não persistem até usuário aceitar explicitamente

### Subfase 4a2 — IA Categorização + Dedup
- [x] `AiCategorizationService` reutiliza `Ai::Client` existente + novo prompt `categorize_bank_transaction`
- [x] `DeduplicationService`:
  - Match exato: amount + date + description idêntico → `duplicate`
  - Match fuzzy: amount + date ±3 dias + description similar → `possible_duplicate`
  - Compara com `FinancialRecord.where(user:, due_date: range, amount:)`
- [ ] Batch processing: job processa lote de 50 transações por vez
- [ ] Retry com backoff para falhas de IA

### Subfase 4a3 — Revisão + Conversão
- [ ] `GET /bank/transactions/pending` (lista agrupada por data)
- [x] `POST /bank/transactions/accept` (lote: aceita selecionadas → cria FinancialRecord)
- [x] `POST /bank/transactions/reject` (marca como rejeitada)
- [x] `POST /bank/transactions/merge/:id` (mescla duplicata com registro existente)
- [x] Gatilhos pós-aceitação: gamificação, goals, achievements (mesmo flow do create manual)

### Subfase 4a4 — Mobile
- [x] Tela "Importar Extrato" (file picker para OFX/CSV)
- [ ] Progresso do parsing (barra + etapa atual)
- [x] Lista de transações pendentes com cards (descrição, valor, data, categoria sugerida)
- [x] Ação em lote: "Aceitar selecionadas" / "Rejeitar"
- [ ] Indicador de duplicatas (amarelo = possível dup, vermelho = dup confirmada)

### Subfase 4b — Open Finance Direto (futuro)
- [ ] Pesquisa de certificação Bacen para Open Finance
- [ ] Implementar `BankProvider` interface (suporta `OfxParser | CsvParser | OpenFinanceConnector`)
- [ ] Conector Open Finance via API Bacen (redirect + token)
- [ ] Webhook para sync automático
- [ ] Reutilizar Pipeline (categorização + dedup + revisão)

---

## Data Model

```ruby
# Migration: CreateImportedTransactions
create_table :imported_transactions do |t|
  t.references :user, null: false, foreign_key: true
  t.string :source, null: false                    # ofx_upload | csv_upload | open_finance
  t.string :source_filename                        # nome do arquivo original (se upload)
  t.string :description, null: false
  t.decimal :amount, precision: 12, scale: 2, null: false
  t.date :date, null: false
  t.string :flow_type                              # income | expense (inferido)
  t.string :original_category                      # categoria do extrato original
  t.string :suggested_category                     # categoria sugerida pela IA
  t.decimal :ai_confidence, precision: 4, scale: 3
  t.string :status, default: "pending"             # pending | duplicate | accepted | rejected
  t.string :duplicate_reason                       # exact_match | fuzzy_match
  t.references :duplicate_of, foreign_key: { to_table: :financial_records }
  t.references :financial_record, foreign_key: true  # após aceitação
  t.string :import_batch_id                        # UUID do lote de importação
  t.jsonb :original_data, default: {}              # dados brutos (LGPD: cleanup após aceitar)
  t.timestamps
end
add_index :imported_transactions, [:user_id, :status]
add_index :imported_transactions, [:user_id, :date]
add_index :imported_transactions, :import_batch_id
add_index :imported_transactions, [:amount, :date, :description], name: "idx_dedup_lookup"
```

## LGPD Compliance

| Prática | Implementação |
|---------|---------------|
| Consentimento | Tela "O que será importado?" antes do upload |
| Minimização | Só importa transações, não saldo ou dados cadastrais |
| Transparência | Preview antes de aceitar |
| Direito à exclusão | Delete batch → remove todas as ImportedTransaction do lote |
| Dados bancários | `original_data` cleanup 30 dias após aceitação |
| Não retenção | `source_filename` sem metadados do usuário |

## Dedup Strategy

1. **Exact match**: amount + date + description (normalizada) → `duplicate`, `reason: exact_match`, link p/ `FinancialRecord`
2. **Fuzzy match**: amount + date ±3d + description similarity (Levenshtein >80%) → `duplicate`, `reason: fuzzy_match`
3. **Sem match**: `pending` → aguarda revisão
4. **Revisão manual**: usuário vê duplicatas sinalizadas, pode forçar aceitar

## Riscos Atualizados

| Risco | Prob | Impacto | Mitigação |
|-------|:----:|:-------:|-----------|
| OFX/CSV parsing imperfeito (bancos BR) | Alta | Médio | Fallback p/ CSV + AI parseia descrição |
| Dedup falso positivo/negativo | Média | Médio | Revisão manual + override |
| Certificação Open Finance demorada | Alta | Alto | FASE 4b separada, não bloqueia 4a |
| LGPD: dados bancários sensíveis | Média | Alto | Minimização + cleanup automático |
| Usuário não sabe exportar extrato | Alta | Médio | Guia passo-a-passo por banco |
