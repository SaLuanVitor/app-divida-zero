# Story 4.5 — Review + Accept Endpoints (TransactionsController)

> **Fase:** 4 — Integração Bancária
> **Subfase:** 4a1 — Upload + Parsing
> **Story:** 4.5 — Review + Accept Endpoints
> **Prioridade:** Alta
> **Dependências:** Story 4.4 (upload endpoints)

---

## Acceptance Criteria

- [x] AC-01: `GET /api/v1/bank/transactions/pending` lista transações pending + duplicate
- [x] AC-02: Lista ordenada por data decrescente, limite 200
- [x] AC-03: Cada item retorna: id, description, amount, date, flow_type, suggested_category, ai_confidence, status, duplicate_reason, duplicate_of_id
- [x] AC-04: `POST /api/v1/bank/transactions/accept` aceita lote (array de IDs)
- [x] AC-05: Aceitar cria `FinancialRecord` para cada transação
- [x] AC-06: `FinancialRecord` criado com: title=description, amount, due_date=date, flow_type, category=suggested_category, record_type="launch"
- [x] AC-07: Após aceitar, `ImportedTransaction.status = "accepted"` e `financial_record_id` preenchido
- [x] AC-08: Aceitar dispara gamificação (+30 XP por transação)
- [x] AC-09: Aceitar recalcula goals e achievements
- [x] AC-10: `POST /api/v1/bank/transactions/reject` marca lote como rejected
- [x] AC-11: `POST /api/v1/bank/transactions/:id/merge` vincula duplicata a FinancialRecord existente
- [x] AC-12: Requer autenticação JWT em todos os endpoints
- [ ] AC-13: Testes de controller + integração

---

## Files

### TransactionsController

```ruby
# app/controllers/api/v1/bank/transactions_controller.rb
module Api
  module V1
    module Bank
      class TransactionsController < ApplicationController
        before_action :authenticate_access_token!

        def pending
          transactions = @current_user.imported_transactions
                                       .pending_or_duplicate
                                       .order(date: :desc)
                                       .limit(200)

          render json: {
            transactions: transactions.map { |t| serialize(t) }
          }, status: :ok
        end

        def accept
          ids = params[:transaction_ids]
          return render json: { error: "Selecione ao menos uma transação." }, status: :unprocessable_entity unless ids.is_a?(Array) && ids.any?

          transactions = @current_user.imported_transactions
                                       .where(id: ids, status: %w[pending duplicate])

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

        def reject
          ids = params[:transaction_ids]
          return render json: { error: "Selecione ao menos uma transação." }, status: :unprocessable_entity unless ids.is_a?(Array) && ids.any?

          updated = @current_user.imported_transactions
                                 .where(id: ids, status: %w[pending duplicate])
                                 .update_all(status: "rejected")

          render json: { rejected: updated }, status: :ok
        end

        def merge
          transaction = @current_user.imported_transactions.find(params[:id])
          record_id = params[:financial_record_id]

          return render json: { error: "Informe o ID do registro financeiro." }, status: :unprocessable_entity unless record_id.present?

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

        def authenticate_access_token!
          super
        end
      end
    end
  end
end
```

### Routes

```ruby
# Adicionar em config/routes.rb dentro de namespace :api/v1, namespace :bank:
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
```

Resultado final em routes:

```
GET   /api/v1/bank/transactions/pending      → bank/transactions#pending
POST  /api/v1/bank/transactions/accept       → bank/transactions#accept
POST  /api/v1/bank/transactions/reject       → bank/transactions#reject
POST  /api/v1/bank/transactions/:id/merge    → bank/transactions#merge
```
