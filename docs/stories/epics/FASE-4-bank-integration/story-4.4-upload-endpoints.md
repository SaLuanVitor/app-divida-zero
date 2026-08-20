# Story 4.4 — Upload + Status Endpoints (StatementsController)

> **Fase:** 4 — Integração Bancária
> **Subfase:** 4a1 — Upload + Parsing
> **Story:** 4.4 — Upload + Status Endpoints
> **Prioridade:** Alta
> **Dependências:** Stories 4.1, 4.2, 4.3 (model + parsers + ai/dedup)

---

## Acceptance Criteria

- [x] AC-01: `POST /api/v1/bank/statements/upload` aceita multipart file
- [x] AC-02: Valida extensão: apenas .ofx, .qfx, .csv
- [x] AC-03: Valida tamanho máximo: 10MB
- [x] AC-04: Retorna 202 + `batch_id` + `status: "processing"`
- [x] AC-05: Salva arquivo em `tmp/imports/{batch_id}/{filename}`
- [x] AC-06: Enfileira `StatementParseJob` com `batch_id`, `file_path`, `user_id`
- [x] AC-07: `GET /api/v1/bank/statements/:batch_id/status` retorna progresso
- [x] AC-08: Status possíveis: `processing` → `done` | `error`
- [x] AC-09: Se job falha, retorna status `error` com mensagem (via cache `bank_import_batch:{batch_id}`)
- [x] AC-10: Extensão inválida retorna 422 com mensagem amigável
- [x] AC-11: Requer autenticação JWT (401 se sem token)
- [x] AC-12: Testes de controller (upload válido, inválido, sem arquivo) + delete de lote (LGPD)

---

## Files

### StatementsController

```ruby
# app/controllers/api/v1/bank/statements_controller.rb
module Api
  module V1
    module Bank
      class StatementsController < ApplicationController
        MAX_FILE_SIZE = 10.megabytes
        ALLOWED_EXTENSIONS = %w[.ofx .qfx .csv].freeze

        before_action :authenticate_access_token!

        def upload
          file = params[:file]
          return render_json_error("Arquivo é obrigatório.", :unprocessable_entity) unless file.present?

          ext = File.extname(file.original_filename).downcase
          return render_json_error("Formato não suportado. Use OFX ou CSV.", :unprocessable_entity) unless ALLOWED_EXTENSIONS.include?(ext)
          return render_json_error("Arquivo muito grande. Máximo: 10MB.", :unprocessable_entity) if file.size > MAX_FILE_SIZE

          batch_id = SecureRandom.uuid
          temp_dir = Rails.root.join("tmp", "imports", batch_id)
          FileUtils.mkdir_p(temp_dir)
          temp_path = temp_dir.join(file.original_filename)
          File.open(temp_path, "wb") { |f| f.write(file.read) }

          StatementParseJob.perform_later(
            batch_id: batch_id,
            file_path: temp_path.to_s,
            user_id: @current_user.id
          )

          render json: {
            batch_id: batch_id,
            status: "processing",
            message: "Importação iniciada. Use o batch_id para acompanhar."
          }, status: :accepted
        end

        def status
          batch_id = params[:batch_id]
          return render json: { error: "batch_id é obrigatório." }, status: :unprocessable_entity if batch_id.blank?

          # Verificar se o batch existe em algum lugar (job pode estar rodando)
          has_batch = SolidQueue::Job.where("arguments LIKE ?", "%#{batch_id}%").exists? ||
                      @current_user.imported_transactions.where(import_batch_id: batch_id).exists?

          unless has_batch
            return render json: { error: "Importação não encontrada." }, status: :not_found
          end

          transactions = @current_user.imported_transactions.where(import_batch_id: batch_id)

          if transactions.empty?
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

        private

        def render_json_error(message, status)
          render json: { error: message }, status: status
        end

        def authenticate_access_token!
          super
        end
      end
    end
  end
end
```

### StatementParseJob

```ruby
# app/jobs/statement_parse_job.rb
class StatementParseJob < ApplicationJob
  queue_as :bank

  retry_on ActiveRecord::RecordInvalid, wait: :polynomially_longer, attempts: 3
  discard_on StandardError do |job, error|
    args = job.arguments.first
    # Cleanup: remover transações parciais
    ImportedTransaction.where(import_batch_id: args[:batch_id]).destroy_all
    # Notificar usuário
    user = User.find(args[:user_id])
    NotificationAlertsService.notify(
      user: user,
      type: "import_failed",
      message: "A importação do extrato falhou: #{error.message}"
    )
  end

  def perform(batch_id:, file_path:, user_id:)
    # Step 1: Parse
    parse_result = Bank::StatementParsingService.process(
      batch_id: batch_id,
      file_path: file_path,
      user_id: user_id
    )

    # Step 2: Cleanup temp file
    File.delete(file_path) if File.exist?(file_path)

    if parse_result[:error]
      raise StandardError, parse_result[:error]
    end

    # Step 3: AI Categorize (pipeline: parse → categorize → dedup)
    transactions = ImportedTransaction.where(import_batch_id: batch_id)
    user = User.find(user_id)

    categorized = Bank::AiCategorizationService.categorize_batch(
      user,
      transactions.map { |t| {
        id: t.id, description: t.description, amount: t.amount,
        flow_type: t.flow_type, original_category: t.original_category
      }},
      test_mode: Rails.env.test?
    )

    # Update com categorização
    categorized.each do |cat|
      ImportedTransaction.where(id: cat[:id]).update_all(
        suggested_category: cat[:suggested_category],
        ai_confidence: cat[:ai_confidence],
        flow_type: cat[:flow_type]
      )
    end

    # Step 4: Dedup
    deduped_transactions = ImportedTransaction.where(import_batch_id: batch_id).map { |t|
      { id: t.id, description: t.description, amount: t.amount,
        date: t.date, flow_type: t.flow_type, fit_id: t.fit_id }
    }
    with_dedup = Bank::DeduplicationService.detect(user, deduped_transactions)

    with_dedup.each do |txn|
      ImportedTransaction.where(id: txn[:id]).update_all(
        status: txn[:status],
        duplicate_reason: txn[:duplicate_reason],
        duplicate_of_id: txn[:duplicate_of_id]
      )
    end

    # Step 5: Notify user
    ready_count = with_dedup.count { |t| t[:status] == "pending" }
    NotificationAlertsService.notify(
      user: user,
      type: "import_ready",
      message: "#{ready_count} transações importadas. Revise e aceite."
    )
  end
end
```

### Queue config

```yaml
# Em config/queue.yml — adicionar workers:
# workers:
#   - queues: [bank, *]
#     threads: 2
```

### Routes

```ruby
# Em config/routes.rb — adicionar dentro de namespace :api/v1:
namespace :bank do
  resources :statements, only: [] do
    collection do
      post :upload
    end
    member do
      get :status
    end
  end
end
```

Resultado final em routes:

```ruby
POST  /api/v1/bank/statements/upload   → bank/statements#upload
GET   /api/v1/bank/statements/:batch_id/status → bank/statements#status
```
