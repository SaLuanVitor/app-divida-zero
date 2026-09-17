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

          grouped = transactions.group_by(&:date).map do |date, items|
            { date: date, transactions: items.map { |t| serialize(t) } }
          end

          render json: {
            groups: grouped,
            total: transactions.size
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
