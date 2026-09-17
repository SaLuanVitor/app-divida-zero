class StatementParseJob < ApplicationJob
  queue_as :bank

  retry_on ActiveRecord::RecordInvalid, wait: :polynomially_longer, attempts: 3
  discard_on StandardError do |job, error|
    args = job.arguments.first
    ImportedTransaction.where(import_batch_id: args[:batch_id]).destroy_all
    Rails.cache.write(batch_cache_key(args[:batch_id]), { status: "error", error: error.message }, expires_in: 24.hours)
    user = User.find(args[:user_id])
    NotificationAlertsService.notify(
      user: user,
      type: "import_failed",
      message: "A importação do extrato falhou: #{error.message}"
    )
  end

  def perform(batch_id:, file_path:, user_id:)
    update_progress(batch_id, step: "parsing", progress: 10)

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

    update_progress(batch_id, step: "categorizing", progress: 30)
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

    update_progress(batch_id, step: "deduplicating", progress: 60)
    ImportedTransaction.where(import_batch_id: batch_id).find_in_batches(batch_size: BATCH_SIZE) do |batch|
      deduped_transactions = batch.map { |t|
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
    end

    update_progress(batch_id, step: "done", progress: 100)
    ready_count = transactions.pending.count
    NotificationAlertsService.notify(
      user: user,
      type: "import_ready",
      message: "#{ready_count} transações importadas. Revise e aceite."
    )
  end

  private

  BATCH_SIZE = 50

  def batch_cache_key(batch_id)
    "bank_import_batch:#{batch_id}"
  end

  def update_progress(batch_id, step:, progress:)
    Rails.cache.write(batch_cache_key(batch_id), { step: step, progress: progress }, expires_in: 24.hours)
  end
end
