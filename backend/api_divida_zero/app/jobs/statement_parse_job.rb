class StatementParseJob < ApplicationJob
  queue_as :bank

  retry_on ActiveRecord::RecordInvalid, wait: :polynomially_longer, attempts: 3
  discard_on StandardError do |job, error|
    args = job.arguments.first
    ImportedTransaction.where(import_batch_id: args[:batch_id]).destroy_all
    user = User.find(args[:user_id])
    NotificationAlertsService.notify(
      user: user,
      type: "import_failed",
      message: "A importação do extrato falhou: #{error.message}"
    )
  end

  def perform(batch_id:, file_path:, user_id:)
    parse_result = Bank::StatementParsingService.process(
      batch_id: batch_id,
      file_path: file_path,
      user_id: user_id
    )

    File.delete(file_path) if File.exist?(file_path)

    if parse_result[:error]
      raise StandardError, parse_result[:error]
    end

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

    categorized.each do |cat|
      ImportedTransaction.where(id: cat[:id]).update_all(
        suggested_category: cat[:suggested_category],
        ai_confidence: cat[:ai_confidence],
        flow_type: cat[:flow_type]
      )
    end

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

    ready_count = with_dedup.count { |t| t[:status] == "pending" }
    NotificationAlertsService.notify(
      user: user,
      type: "import_ready",
      message: "#{ready_count} transações importadas. Revise e aceite."
    )
  end
end
