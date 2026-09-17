# Arquitetura Técnica — Subfase 4a1: Importação OFX/CSV

> **Fase:** 4 — Integração Bancária
> **Subfase:** 4a1 — Upload + Parsing + IA + Dedup
> **Autor:** Aria (Architect)
> **Data:** 2026-07-12
> **Stack:** Rails 8.1 API-only, PostgreSQL, Solid Queue, OpenAI (GPT-4.1-mini)

---

## 1. Visão Geral da Pipeline

```
Mobile/Web                          Backend (Rails API)
┌─────────────┐                   ┌──────────────────────────────────────────┐
│ File Picker  │  multipart POST  │  Bank::StatementsController              │
│ (.ofx/.csv)  │ ──────────────►  │  POST /bank/statements/upload            │
│              │                  │    ├─ valida formato                      │
│              │                  │    ├─ salva arquivo temp                  │
│              │                  │    └─ enfileira StatementParseJob         │
│              │                  │       { batch_id, file_path, user_id }    │
│              │                  │       → retorna 202 + batch_id            │
├─────────────┤                  ├──────────────────────────────────────────┤
│ Polling      │  GET status      │  Bank::StatementsController              │
│ progress     │ ◄────────────── │  GET /bank/statements/:batch_id/status    │
│              │                  │    ├─ pending → processing → done/error   │
└─────────────┘                  │    └─ total, processed, categorized, dups │
                                  └──────────┬───────────────────────────────┘
                                             │
                                  ┌──────────▼───────────────────────────────┐
                                  │  StatementParseJob (fila: bank)          │
                                  │    ├─ 1. Bank::FormatDetector            │
                                  │    │    ├─ OFX → OfxParser               │
                                  │    │    └─ CSV → CsvParser               │
                                  │    ├─ 2. Bank::AiCategorizationService   │
                                  │    │    ├─ batch de 20 transações         │
                                  │    │    └─ reusa Ai::Client               │
                                  │    ├─ 3. Bank::DeduplicationService      │
                                  │    │    ├─ exact match (amount+date+desc) │
                                  │    │    └─ fuzzy match (amount+date±3d)  │
                                  │    └─ 4. ImportedTransaction.create!     │
                                  │          (status: pending ou duplicate)   │
                                  └──────────────────────────────────────────┘
                                             │
                                  ┌──────────▼───────────────────────────────┐
                                  │  Usuário revisa no Mobile                │
                                  │    ├─ GET  /bank/transactions/pending    │
                                  │    ├─ POST /bank/transactions/accept     │
                                  │    │   └─ cria FinancialRecord           │
                                  │    │   └─ dispara gamificação            │
                                  │    ├─ POST /bank/transactions/reject     │
                                  │    └─ POST /bank/transactions/:id/merge  │
                                  └──────────────────────────────────────────┘
```

---

## 2. Componentes

### 2.1 Models

#### ImportedTransaction

```ruby
# db/migrate/20260712000001_create_imported_transactions.rb
create_table :imported_transactions do |t|
  t.references :user, null: false, foreign_key: true
  t.string :import_batch_id, null: false        # UUID do lote
  t.string :source, null: false                 # ofx_upload | csv_upload
  t.string :source_filename                     # nome original do arquivo
  t.string :description, null: false
  t.decimal :amount, precision: 12, scale: 2, null: false
  t.date :date, null: false
  t.string :flow_type                           # income | expense (inferido)
  t.string :original_category                   # categoria do extrato
  t.string :suggested_category                  # sugestão da IA
  t.decimal :ai_confidence, precision: 4, scale: 3
  t.string :status, default: "pending"          # pending | duplicate | accepted | rejected
  t.string :duplicate_reason                    # exact_match | fuzzy_match
  t.references :duplicate_of, foreign_key: { to_table: :financial_records }
  t.references :financial_record, foreign_key: true  # preenchido após aceitar
  t.jsonb :original_data, default: {}           # raw bank data (cleanup 30d)
  t.string :fit_id                              # OFX FIT ID (unique per account)
  t.string :check_number                        # for check transactions
  t.timestamps
end

add_index :imported_transactions, :import_batch_id
add_index :imported_transactions, [:user_id, :status]
add_index :imported_transactions, [:user_id, :date]
add_index :imported_transactions, [:amount, :date, :description], name: "idx_imported_dedup"
add_index :imported_transactions, [:user_id, :fit_id], unique: true, where: "fit_id IS NOT NULL"
```

### 2.2 Services

#### Bank::FormatDetector

```ruby
# app/services/bank/format_detector.rb
module Bank
  class FormatDetector
    def self.detect(file_path)
      content = File.read(file_path, 1024)  # primeiros 1KB
      if content.include?("OFXHEADER") || content.include?("<OFX>")
        :ofx
      elsif content.match?(/,|;|\t/)
        :csv
      else
        :unknown
      end
    end
  end
end
```

#### Bank::OfxParser

```ruby
# app/services/bank/ofx_parser.rb
module Bank
  class OfxParser
    # Input: raw file content
    # Output: Array of { description:, amount:, date:, fit_id:, check_number:, original_category: }
    # Uses `OFX` gem (ofx 2.x) — handles both OFX 1.x (SGML) and 2.x (XML)
    #
    # Edge cases:
    # - Negative amount = expense, positive = income (invertido no OFX)
    # - FIT ID usado para dedup intra-arquivo
    # - Transferências internas filtradas (opcional)
    def parse(file_path)
      ofx = OFX::Parser.parse_file(file_path)
      ofx.accounts.flat_map { |account| parse_account(account) }
    end

    private

    def parse_account(account)
      account.transactions.map do |txn|
        {
          fit_id: txn.fit_id,
          description: normalize_description(txn.name, txn.memo),
          amount: txn.amount.abs,
          date: txn.date,
          flow_type: txn.amount.negative? ? "expense" : "income",
          original_category: txn.category.presence,
          check_number: txn.check_number
        }
      end
    end

    def normalize_description(name, memo)
      desc = [name, memo].compact.map(&:strip).reject(&:empty?)
      desc.any? ? desc.join(" - ") : "Transação sem descrição"
    end
  end
end
```

#### Bank::CsvParser

```ruby
# app/services/bank/csv_parser.rb
module Bank
  class CsvParser
    # Detecta automaticamente:
    # - Delimitador (vírgula, ponto-e-vírgula, tab)
    # - Colunas por header matching (data, valor, descrição)
    # - Encoding (UTF-8, ISO-8859-1, Windows-1252)
    #
    # Bancos BR comuns (Nubank, Inter, Itaú, Bradesco) têm formatos
    # ligeiramente diferentes — o detector de colunas lida com isso.
    def parse(file_path)
      raw = File.read(file_path)
      encoding = detect_encoding(raw)
      content = raw.encode("UTF-8", encoding, invalid: :replace, undef: :replace)
      delimiter = detect_delimiter(content)
      rows = CSV.parse(content, col_sep: delimiter, headers: true)
      headers = normalize_headers(rows.headers)
      column_map = detect_columns(headers)

      rows.map do |row|
        build_transaction(row, column_map)
      end
    end

    private

    COLUMN_PATTERNS = {
      date: [/data|date|vencimento|lançamento|lançamento/i],
      description: [/descriç|descrição|historico|histórico|nome|titulo|título|identificação/i],
      amount: [/valor|value|amount|montante|valor\(r\$\)/i],
      type: [/tipo|type|crédito|débito|entrada|saída|flow|natureza/i],
      category: [/categoria|category|grupo/i],
      document: [/documento|doc|comprovante|número|número/i]
    }.freeze
  end
end
```

#### Bank::StatementParsingService

```ruby
# app/services/bank/statement_parsing_service.rb
module Bank
  class StatementParsingService
    def self.process(batch_id:, file_path:, user_id:)
      user = User.find(user_id)
      format = Bank::FormatDetector.detect(file_path)

      case format
      when :ofx then parser = Bank::OfxParser.new
      when :csv then parser = Bank::CsvParser.new
      else raise Bank::UnsupportedFormatError, "Formato não suportado. Use OFX ou CSV."
      end

      raw_transactions = parser.parse(file_path)
      categorized = Bank::AiCategorizationService.categorize_batch(user, raw_transactions)
      with_dedup = Bank::DeduplicationService.detect(user, categorized)

      ImportedTransaction.transaction do
        with_dedup.each { |txn| create_transaction!(user, txn.merge(import_batch_id: batch_id, source: format.to_s)) }
      end

      { total: with_dedup.size, created: with_dedup.size, batch_id: batch_id }
    rescue StandardError => e
      { error: e.message, batch_id: batch_id }
    end
  end
end
```

#### Bank::AiCategorizationService

```ruby
# app/services/bank/ai_categorization_service.rb
module Bank
  class AiCategorizationService
    BATCH_SIZE = 20

    # Categoriza um lote de transações via IA
    # Envia múltiplas transações em uma única chamada para economizar tokens
    def self.categorize_batch(user, transactions)
      transactions.each_slice(BATCH_SIZE).flat_map do |batch|
        result = call_ai(user, batch)
        merge_results(batch, result)
      end
    end

    private

    def self.call_ai(user, transactions)
      payload = {
        transactions: transactions.map { |t| { description: t[:description], amount: t[:amount] } }
      }
      context = Ai::ContextBuilder.for_categorization(user, payload)
      prompt = Ai::PromptBuilder.categorize_bank_transactions(context)

      ai_result = Ai::Client.generate_json(
        feature: "categorize_bank_transactions",
        system_prompt: system_prompt,
        user_prompt: prompt,
        fallback: ->(feat) { build_fallback(transactions) },
        response_guard: method(:guard_response).to_proc
      )

      ai_result[:content]  # Array de { index, suggested_category, suggested_flow_type, confidence }
    end

    def self.system_prompt
      <<~PROMPT
        Você é um assistente especializado em categorizar transações bancárias.
        Para cada transação, responda com JSON no formato:
        { "transactions": [
          { "index": 0, "suggested_category": "Alimentação", "suggested_flow_type": "expense", "confidence": 0.92 },
          ...
        ] }
        Categorias possíveis: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, 
        Serviços, Compras, Salário, Investimentos, Transferências, Impostos, Assinaturas, 
        Outros.
        Se o valor for negativo (saída), flow_type é "expense". Se positivo, "income".
      PROMPT
    end
  end
end
```

#### Bank::DeduplicationService

```ruby
# app/services/bank/deduplication_service.rb
module Bank
  class DeduplicationService
    # Estratégia de dedup:
    # 1. Exact match: amount + date + description (normalizada)
    # 2. Fuzzy match: amount + date ±3d + description similar
    # 3. FIT ID match: se disponível no OFX

    def self.detect(user, transactions)
      existing = build_existing_index(user)
      transactions.map do |txn|
        duplicate = find_duplicate(txn, existing)
        if duplicate
          txn.merge(
            status: "duplicate",
            duplicate_reason: duplicate[:reason],
            duplicate_of_id: duplicate[:record_id]
          )
        else
          txn.merge(status: "pending")
        end
      end
    end

    private

    def self.build_existing_index(user)
      # Carrega FinancialRecord dos últimos 6 meses para comparação
      six_months_ago = Date.current - 6.months
      user.financial_records
          .where(due_date: six_months_ago..)
          .select(:id, :title, :amount, :due_date)
          .map { |r| { id: r.id, title: normalize(r.title), amount: r.amount, date: r.due_date } }
    end

    def self.find_duplicate(txn, existing)
      # Exact match
      exact = existing.find do |e|
        e[:amount] == txn[:amount] &&
          e[:date] == txn[:date] &&
          similarity(e[:title], normalize(txn[:description])) > 0.9
      end
      return { reason: "exact_match", record_id: exact[:id] } if exact

      # Fuzzy match
      fuzzy = existing.find do |e|
        e[:amount] == txn[:amount] &&
          (e[:date] - txn[:date]).abs <= 3 &&
          similarity(e[:title], normalize(txn[:description])) > 0.7
      end
      return { reason: "fuzzy_match", record_id: fuzzy[:id] } if fuzzy

      nil
    end

    def self.normalize(str)
      str.to_s.downcase.gsub(/[^a-z0-9áéíóúàâêôãõç\s]/i, "").strip
    end

    def self.similarity(a, b)
      # Levenshtein ratio simplificado
      return 0.0 if a.nil? || b.nil?
      max_len = [a.length, b.length].max
      return 1.0 if max_len.zero?
      1.0 - levenshtein(a, b).to_f / max_len
    end

    def self.levenshtein(a, b)
      # Implementação padrão de Levenshtein distance
      n = a.length
      m = b.length
      return m if n.zero?
      return n if m.zero?

      matrix = (0..m).to_a
      (1..n).each do |i|
        prev = matrix[0]
        matrix[0] = i
        (1..m).each do |j|
          temp = matrix[j]
          matrix[j] = if a[i - 1] == b[j - 1]
                        prev
                      else
                        [matrix[j] + 1, matrix[j - 1] + 1, prev + 1].min
                      end
          prev = temp
        end
      end
      matrix[m]
    end
  end
end
```

### 2.3 Jobs

```ruby
# app/jobs/statement_parse_job.rb
class StatementParseJob < ApplicationJob
  queue_as :bank

  retry_on Bank::UnsupportedFormatError, wait: :polynomially_longer, attempts: 1
  retry_on ActiveRecord::RecordInvalid, wait: :polynomially_longer, attempts: 3
  discard_on StandardError do |job, error|
    batch_id = job.arguments.first[:batch_id]
    ImportedTransaction.where(import_batch_id: batch_id).destroy_all
    # Notificar usuário sobre falha
    NotificationAlertsService.notify(
      user: User.find(job.arguments.first[:user_id]),
      type: "import_failed",
      message: "A importação do extrato falhou: #{error.message}"
    )
  end

  def perform(batch_id:, file_path:, user_id:)
    result = Bank::StatementParsingService.process(
      batch_id: batch_id,
      file_path: file_path,
      user_id: user_id
    )
    # Cleanup: remover arquivo temporário
    File.delete(file_path) if File.exist?(file_path)

    if result[:error]
      raise StandardError, result[:error]
    end

    # Atualiza status do lote para done
    # Notifica usuário que importação está pronta para revisão
    NotificationAlertsService.notify(
      user: User.find(user_id),
      type: "import_ready",
      message: "#{result[:total]} transações importadas. Revise e aceite."
    )
  end
end
```

### 2.4 Controllers

```ruby
# app/controllers/api/v1/bank/statements_controller.rb
module Api
  module V1
    module Bank
      class StatementsController < ApplicationController
        before_action :authenticate_access_token!

        # POST /api/v1/bank/statements/upload
        def upload
          file = params[:file]
          unless file.present?
            return render json: { error: "Arquivo é obrigatório." }, status: :unprocessable_entity
          end

          unless %w[.ofx .qfx .csv].include?(File.extname(file.original_filename).downcase)
            return render json: { error: "Formato não suportado. Use OFX ou CSV." }, status: :unprocessable_entity
          end

          batch_id = SecureRandom.uuid
          temp_path = Rails.root.join("tmp", "imports", batch_id, file.original_filename)
          FileUtils.mkdir_p(File.dirname(temp_path))
          File.open(temp_path, "wb") { |f| f.write(file.read) }

          StatementParseJob.perform_later(
            batch_id: batch_id,
            file_path: temp_path.to_s,
            user_id: @current_user.id
          )

          render json: {
            batch_id: batch_id,
            status: "processing",
            message: "Importação iniciada. Acompanhe o progresso."
          }, status: :accepted
        end

        # GET /api/v1/bank/statements/:batch_id/status
        def status
          batch_id = params[:batch_id]
          transactions = @current_user.imported_transactions.where(import_batch_id: batch_id)

          if transactions.empty?
            # Verificar se o job ainda está rodando
            return render json: {
              batch_id: batch_id,
              status: "processing",
              progress: 0
            }, status: :ok
          end

          render json: {
            batch_id: batch_id,
            status: "done",
            total: transactions.count,
            pending: transactions.pending.count,
            duplicates: transactions.duplicate.count
          }, status: :ok
        end
      end
    end
  end
end
```

```ruby
# app/controllers/api/v1/bank/transactions_controller.rb
module Api
  module V1
    module Bank
      class TransactionsController < ApplicationController
        before_action :authenticate_access_token!

        # GET /api/v1/bank/transactions/pending
        def pending
          transactions = @current_user.imported_transactions
                                       .pending_or_duplicate
                                       .order(date: :desc)
                                       .limit(200)

          render json: {
            transactions: transactions.map { |t| serialize(t) }
          }, status: :ok
        end

        # POST /api/v1/bank/transactions/accept
        def accept
          ids = params[:transaction_ids]
          unless ids.is_a?(Array) && ids.any?
            return render json: { error: "Selecione ao menos uma transação." }, status: :unprocessable_entity
          end

          transactions = @current_user.imported_transactions.where(id: ids, status: %w[pending duplicate])
          return render json: { error: "Nenhuma transação válida encontrada." }, status: :not_found if transactions.empty?

          created_records = []
          ActiveRecord::Base.transaction do
            transactions.find_each do |txn|
              record = @current_user.financial_records.create!(
                title: txn.description.truncate(100),
                amount: txn.amount,
                due_date: txn.date,
                flow_type: txn.flow_type || "expense",
                record_type: "launch",
                category: txn.suggested_category || txn.original_category,
                status: "pending"
              )
              txn.update!(status: "accepted", financial_record_id: record.id)
              created_records << record
            end
          end

          # Gatilhos pós-criação
          if created_records.any?
            GamificationService.award!(
              user: @current_user,
              event_type: "import_accepted",
              points: created_records.size * 30,
              source: created_records.first,
              metadata: { count: created_records.size }
            )
            FinancialGoalsProgressService.recalculate_for_user!(@current_user)
            DailyAchievementsService.sync_for_user!(@current_user)
          end

          render json: {
            accepted: created_records.size,
            message: "#{created_records.size} transações importadas com sucesso."
          }, status: :ok
        end

        # POST /api/v1/bank/transactions/reject
        def reject
          ids = params[:transaction_ids]
          unless ids.is_a?(Array) && ids.any?
            return render json: { error: "Selecione ao menos uma transação." }, status: :unprocessable_entity
          end

          updated = @current_user.imported_transactions
                                 .where(id: ids, status: %w[pending duplicate])
                                 .update_all(status: "rejected")

          render json: { rejected: updated }, status: :ok
        end

        # POST /api/v1/bank/transactions/:id/merge
        def merge
          transaction = @current_user.imported_transactions.find(params[:id])
          record_id = params[:financial_record_id]

          unless record_id.present?
            return render json: { error: "Informe o ID do registro financeiro." }, status: :unprocessable_entity
          end

          record = @current_user.financial_records.find(record_id)
          transaction.update!(status: "accepted", duplicate_of_id: record_id, financial_record_id: record_id)

          render json: { message: "Transação mesclada com sucesso." }, status: :ok
        end

        private

        def serialize(txn)
          {
            id: txn.id,
            description: txn.description,
            amount: txn.amount.to_s,
            date: txn.date,
            flow_type: txn.flow_type,
            suggested_category: txn.suggested_category,
            ai_confidence: txn.ai_confidence,
            original_category: txn.original_category,
            status: txn.status,
            duplicate_reason: txn.duplicate_reason,
            duplicate_of_id: txn.duplicate_of_id
          }
        end
      end
    end
  end
end
```

### 2.5 Routes

```ruby
# config/routes.rb — adicionar no namespace api/v1
namespace :bank do
  resources :statements, only: [] do
    collection do
      post :upload
      get :status, path: ":batch_id/status"
    end
  end
  resources :transactions, only: [] do
    collection do
      get :pending
      post :accept
      post :reject
    end
    member do
      post :merge
    end
  end
end
```

### 2.6 Model: Scopes em ImportedTransaction

```ruby
class ImportedTransaction < ApplicationRecord
  belongs_to :user
  belongs_to :duplicate_of, class_name: "FinancialRecord", optional: true
  belongs_to :financial_record, optional: true

  scope :pending, -> { where(status: "pending") }
  scope :duplicate, -> { where(status: "duplicate") }
  scope :accepted, -> { where(status: "accepted") }
  scope :rejected, -> { where(status: "rejected") }
  scope :pending_or_duplicate, -> { where(status: %w[pending duplicate]) }

  scope :from_batch, ->(batch_id) { where(import_batch_id: batch_id) }
end
```

---

## 3. Fluxo de Dados Detalhado

### 3.1 Upload → Parse → Categorize → Dedup

```
User envia ofx/csv
    │
    ▼
StatementsController#upload
    │
    ├─ Valida extensão (.ofx|.qfx|.csv)
    ├─ Valida tamanho (< 10MB)
    ├─ Gera batch_id (UUID)
    ├─ Salva em tmp/imports/{batch_id}/{filename}
    └─ Enfileira StatementParseJob
       │
       ▼
    StatementParseJob#perform
       │
       ├─ 1. FormatDetector.detect(file)
       │     ├─ :ofx → OfxParser.new.parse(file)
       │     │     ├─ Lê FIT ID, descrição, valor, data, categoria
       │     │     └─ Retorna array de hashes normalizados
       │     └─ :csv → CsvParser.new.parse(file)
       │           ├─ Detecta encoding, delimitador, colunas
       │           └─ Retorna array de hashes normalizados
       │
       ├─ 2. AiCategorizationService.categorize_batch(user, transactions)
       │     ├─ Divide em lotes de 20
       │     ├─ Chama Ai::Client.generate_json (OpenAI)
       │     ├─ Prompt: "Para cada transação, sugira categoria e flow_type"
       │     └─ Merge: resultado da IA + transação original
       │
       ├─ 3. DeduplicationService.detect(user, categorized)
       │     ├─ Carrega FinancialRecord dos últimos 6 meses
       │     ├─ Exact match: amount + date + description ~90%
       │     ├─ Fuzzy match: amount + date ±3d + description ~70%
       │     └─ Marca como duplicate + reason
       │
       ├─ 4. ImportedTransaction.create! (batch insert)
       │     └─ Status: pending (se novo) | duplicate (se match)
       │
       └─ Notifica usuário: "Importação pronta para revisão"
```

### 3.2 Revisão → Aceitação

```
User abre lista de pendentes
    │
    ▼
GET /bank/transactions/pending
    │
    ├─ Lista ImportedTransaction (pending + duplicate)
    ├─ Agrupadas por data (mais recentes primeiro)
    └─ Duplicatas sinalizadas (ícone + reason)
          │
          ▼
    User seleciona → "Aceitar selecionadas"
          │
          ▼
    POST /bank/transactions/accept
          │
          ├─ Transaction: cria FinancialRecord
          │     ├─ title = description (truncated 100)
          │     ├─ amount, due_date, flow_type, category
          │     ├─ record_type = "launch", status = "pending"
          │     └─ link: ImportedTransaction → FinancialRecord
          │
          ├─ Update: ImportedTransaction.status = "accepted"
          ├─ Gamificação: +30 XP por transação aceita
          ├─ Goals: recalcula progresso
          └─ Achievements: sync
```

---

## 4. Gems a Adicionar

| Gem | Versão | Razão |
|:----|:------:|-------|
| `ofx` | ~> 2.2 | Parsing OFX/QFX (SGML + XML). Zero dependências externas |
| `csv` | stdlib | Built-in no Ruby (já disponível) |

**Nota:** `ofx` gem é leve e não requer dependências nativas. OFX 2.x é XML (parsing via `rexml` padrão), OFX 1.x é SGML (parsing proprietário).

---

## 5. LGPD — Data Lifecycle

```
Upload         →  tmp/imports/{batch_id}/*    (deletado após parsing)
                    │
                    ▼
Parsing        →  ImportedTransaction.original_data  (raw bank JSON)
                    │
                    ▼
Aceitação      →  FinancialRecord criado
                    │
                    ▼
Cleanup (30d)  →  Cron job: deleta original_data de registros
                  com updated_at > 30 dias
```

**Regras:**
1. Arquivo temporário deletado após parsing (mesmo em caso de erro)
2. `original_data` contém apenas transações (sem saldo, sem dados cadastrais)
3. Job semanal limpa `original_data` de transações com >30 dias
4. Usuário pode deletar lote → `DELETE` cascade remove todas
5. `source_filename` sem path completo, apenas nome do arquivo

---

## 6. Tratamento de Erros

| Erro | Onde | Ação |
|:-----|:-----|:-----|
| Formato inválido | Controller | Retorna 422 com mensagem + guia |
| Arquivo corrompido | Parser | Job falha → rollback → notifica usuário |
| OFX sem transações | Parser | Cria lote vazio → notifica "Nenhuma transação encontrada" |
| CSV sem colunas detectadas | Parser | Tenta fallback manual → user mapeia colunas |
| IA timeout (9s) | AiCategorizationService | Fallback: categoria "Outros", confidence 0.4 |
| Dedup falso positivo | Revisão | User pode forçar "aceitar como novo" |
| Duplicata aceita | Controller | Merge endpoint permite vincular a FinancialRecord existente |

---

## 7. Fake / Test Mode

Para testes sem OpenAI, o `AiCategorizationService` deve ter fallback:

```ruby
# Em ambiente de test/development
def self.fake_categorize(transactions)
  transactions.each_with_index.map do |txn, idx|
    txn.merge(
      suggested_category: FAKE_CATEGORIES.sample,
      suggested_flow_type: txn[:flow_type] || "expense",
      ai_confidence: 0.85
    )
  end
end
```

E o controller deve aceitar upload sem IA quando `Rails.env.test?`.

---

## 8. Dependências

| Componente | Depende de |
|:-----------|:-----------|
| `StatementParseJob` | `Bank::StatementParsingService`, Solid Queue (`bank` fila) |
| `Bank::StatementParsingService` | `FormatDetector`, `OfxParser`/`CsvParser`, `AiCategorizationService`, `DeduplicationService` |
| `Bank::AiCategorizationService` | `Ai::Client`, `Ai::ContextBuilder`, `Ai::PromptBuilder` |
| `Bank::DeduplicationService` | `FinancialRecord` (query existentes) |
| `StatementsController` | `StatementParseJob`, File upload |
| `TransactionsController` | `ImportedTransaction`, `FinancialRecord`, gamificação |

---

## 9. Performance

- **Upload:** Aceito em 202 (async) — usuário não espera
- **Parsing:** 100 transações OFX em <1s, CSV em <2s
- **IA:** 20 transações/lote, ~3-5s por lote (OpenAI)
- **Total** 100 transações: ~10-15s (IA dominante)
- **Pooling:** Cliente mobile faz polling a cada 3s
- **Backup:** Timeout de 60s — se exceder, marca como erro

---

— Aria, arquitetando o futuro 🏗️
