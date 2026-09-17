# Guia de Integração Bancária - App Dívida Zero

## Visão Geral

O App Dívida Zero suporta duas formas de integração bancária:

1. **Pluggy (Open Finance)** - Conexão via API oficial do Open Finance Brasil
2. **Manual (OFX/CSV)** - Upload de arquivos de extrato bancário

Ambas usam a mesma pipeline de processamento: **Parse → Normalize → Deduplicar → Categorizar (IA) → Salvar**

---

## Pluggy (Open Finance)

### Configuração

```env
# .env
OPEN_FINANCE_PROVIDER=pluggy
PLUGGY_CLIENT_ID=seu_client_id
PLUGGY_CLIENT_SECRET=seu_client_secret
PLUGGY_BASE_URL=https://api.pluggy.ai
PLUGGY_CONNECT_URL=https://connect.pluggy.ai
PLUGGY_WEBHOOK_SECRET=seu_webhook_secret
```

### Fluxo de Conexão

```
1. Frontend: POST /api/v1/financial/connections { institution_id: "nubank" }
   ↓
2. Backend: Retorna { connect_token, connect_url, item_id }
   ↓
3. Frontend: Abre connect_url em WebView (Pluggy Connect Widget)
   ↓
4. Usuário: Seleciona banco → Autentica (MFA) → Autoriza
   ↓
5. Pluggy: Dispara webhook POST /webhooks/pluggy { event: "item/created", itemId: "..." }
   ↓
6. Backend: WebhookProcessingJob → FinancialSyncJob (full sync)
   ↓
7. Sync: Busca contas + transações → Normaliza → Dedup → Categoriza IA → Salva
   ↓
8. Frontend: GET /connections/:id → Atualiza UI
```

### Webhooks Suportados

| Evento | Ação |
|--------|------|
| `item/created` | Atualiza status → active, dispara sync inicial |
| `item/updated` | Verifica status, dispara sync se necessário |
| `item/error` | Status → error, registra erro |
| `item/deleted` | Status → disconnected |
| `transactions/created` | Sync incremental |
| `transactions/updated` | Sync incremental |
| `transactions/deleted` | Sync incremental |
| `item/waiting_user_input` | Status → action_required |
| `item/waiting_user_action` | Status → action_required |

### Validação de Assinatura

```ruby
# Header: Pluggy-Signature: sha256=...
expected = OpenSSL::HMAC.hexdigest('SHA256', PLUGGY_WEBHOOK_SECRET, request.body.read)
provided = request.headers['Pluggy-Signature'].split('=').last
ActiveSupport::SecurityUtils.secure_compare(expected, provided)
```

---

## Manual (OFX/CSV)

### Formatos Suportados

| Formato | Extensões | Parser |
|---------|-----------|--------|
| OFX | .ofx, .qfx | `Bank::OfxParser` |
| CSV | .csv | `Bank::CsvParser` |

### Fluxo de Upload

```
1. Frontend: POST /api/v1/financial/connections (multipart/form-data)
   Params: file (OFX/CSV)
   ↓
2. Backend: Cria FinancialConnection (provider=manual) + FinancialSync (manual_upload)
   Salva arquivo em tmp/imports/
   Enfileira FinancialSyncJob (manual_upload)
   Retorna { batch_id, connection_id }
   ↓
3. FinancialSyncJob: Parse (OfxParser/CsvParser) → Normalize → Dedup → Categoriza IA → Salva
   ↓
4. Frontend: GET /connections/:id → Acompanha status do sync
```

### Formato CSV Esperado

O parser detecta automaticamente as colunas via patterns:

```csv
Data,Descrição,Valor,Tipo,Categoria
15/09/2026,SUPERMERCADO,-150.00,Débito,Alimentação
01/09/2026,SALÁRIO,5000.00,Crédito,Salário
```

Colunas detectadas automaticamente:
- **Data**: data, date, vencimento, lançamento
- **Descrição**: descrição, histórico, nome, título, estabelecimento
- **Valor**: valor, value, amount, montante
- **Tipo**: tipo, crédito, débito, entrada, saída
- **Categoria**: categoria, grupo (opcional)

### Detecção Automática

- **Encoding**: UTF-8 → ISO-8859-1 → Windows-1252
- **Delimitador**: `,` `;` `\t` (detectado pelas primeiras 5 linhas)
- **Data**: DD/MM/YYYY, YYYY-MM-DD, DD/MM/YY

---

## Pipeline de Processamento (Comum)

```
Transação Bruta (Pluggy/Manual)
         ↓
TransactionNormalizer.normalize(provider: :pluggy|:manual)
         ↓
Transação Normalizada:
  - description, amount, date, flow_type (income/expense)
  - fit_id (deduplicação)
  - category, status
         ↓
Bank::DeduplicationService.duplicate?(user, desc, amount, date)
         ↓
Se não duplicata:
  ImportedTransaction.create!(status: 'pending')
         ↓
Bank::AiCategorizationService.categorize!(transaction)
         ↓
Usuário aceita → FinancialRecord.create! + Gamificação
```

---

## Models Principais

### FinancialConnection
```ruby
# Conexão do usuário com uma instituição via provider
belongs_to :user
has_many :financial_syncs
has_many :financial_accounts
has_many :imported_transactions

enum status: { pending: 0, active: 1, error: 2, disconnected: 3, action_required: 4 }
enum provider: { pluggy: 0, manual: 1 }
```

### FinancialSync
```ruby
# Log de cada sincronização
belongs_to :financial_connection

enum sync_type: { full: 0, incremental: 1, manual_upload: 2 }
enum status: { processing: 0, completed: 1, failed: 2 }

# Contadores
records_created, records_updated, records_deleted
error_code, error_message
```

### FinancialAccount
```ruby
belongs_to :financial_connection

enum account_type: { checking: 0, savings: 1, credit_card: 2, investment: 3, loan: 4, other: 5 }
```

### ImportedTransaction
```ruby
belongs_to :user
belongs_to :financial_connection
belongs_to :financial_record, optional: true
belongs_to :duplicate_of, class_name: 'FinancialRecord', optional: true

# Para deduplicação
fit_id: string (único por provider)
import_batch_id: string (agrupa uploads manuais)

enum status: { pending: 0, duplicate: 1, accepted: 2, rejected: 3 }
```

---

## Feature Flags

| Flag | Default | Descrição |
|------|---------|-----------|
| `open_finance` | true | Habilita integração Pluggy |
| `manual_import` | true | Habilita upload OFX/CSV |
| `bank_sync` | true | Habilita sincronização (webhook + polling) |
| `credit_cards` | true | Suporte a cartões de crédito |
| `investments` | false | Suporte a investimentos |
| `family` | false | Funcionalidades família |
| `ai_analysis` | true | Categorização por IA |

---

## Limites (Plano Free)

| Recurso | Limite |
|---------|--------|
| Usuários totais | 10 |
| Conexões no sistema | 20 |
| Conexões por usuário | 3 |
| Contas por usuário | 15 |
| Transações/mês | 10.000 |
| Syncs manuais/dia | 2 |

---

## Admin Dashboard

```
GET /admin/financial
```
Métricas:
- Provider status (Pluggy online/offline)
- Conexões: total/limite
- Usuários: total/limite
- Último sync bem-sucedido
- Erros (24h)
- Fila de jobs pendentes
- Lista de conexões com filtros
- Logs de sync (últimos 50)

---

## Testes

```bash
# Unitários
rails test test/services/financial_providers/
rails test test/services/financial/limits_service_test.rb
rails test test/services/financial/feature_flags_test.rb

# Controllers
rails test test/controllers/api/v1/financial/connections_controller_test.rb
rails test test/controllers/api/v1/bank/statements_controller_test.rb
rails test test/controllers/admin/financial_controller_test.rb

# Jobs
rails test test/jobs/financial_sync_job_test.rb
rails test test/jobs/webhook_processing_job_test.rb

# Benchmark
ruby bin/benchmark_import.rb ofx 5
ruby bin/benchmark_import.rb csv 5
```

**Targets:**
- OFX: Parse < 1s, Full Sync < 5s (1000 transações)
- CSV: Parse < 0.5s, Full Sync < 3s (1000 transações)

---

## Troubleshooting

### Pluggy: Webhook não chega
1. Verificar `PLUGGY_WEBHOOK_SECRET` configurado
2. Verificar URL pública acessível (ngrok/Cloudflare Tunnel)
3. Verificar logs: `rails log:tail`

### Pluggy: Token expira
- Token renova automaticamente 1min antes de expirar (2h default)
- Verificar `fetch_auth_token` no adapter

### Manual: Arquivo não processa
1. Verificar encoding (UTF-8/ISO-8859-1)
2. Verificar delimitador CSV
3. Logs: `Rails.logger.error("Manual adapter parse error: #{e.message}")`

### Deduplicação não funciona
- Verificar `fit_id` único
- `Bank::DeduplicationService.duplicate?` usa descrição + valor + data

---

## Roadmap

- [ ] Provider Belvo
- [ ] Provider Open Finance nativo (participante oficial)
- [ ] Investimentos (ações, fundos, renda fixa)
- [ ] Cartão de crédito (fatura, parcelas)
- [ ] Conciliação automática (match fatura ↔ transações)
- [ ] Sync em background com progresso real-time (ActionCable)