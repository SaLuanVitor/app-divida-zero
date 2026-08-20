class CleanupImportedTransactionDataJob < ApplicationJob
  queue_as :default

  RETENTION_DAYS = 30

  def perform(retention_days = RETENTION_DAYS)
    cutoff = retention_days.to_i.days.ago
    count = ImportedTransaction
            .where("updated_at < ?", cutoff)
            .update_all(original_data: {})
    Rails.logger.info "[CleanupImportedTransactionDataJob] original_data limpo em #{count} registros"
  end
end
