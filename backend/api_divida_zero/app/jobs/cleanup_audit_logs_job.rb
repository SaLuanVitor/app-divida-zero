class CleanupAuditLogsJob < ApplicationJob
  queue_as :default

  # Cleanup audit logs older than retention period (default 90 days)
  def perform(retention_days: 90)
    deleted_count = AuditLog.cleanup_old_logs!(days: retention_days)
    Rails.logger.info("[CleanupAuditLogsJob] Deleted #{deleted_count} audit logs older than #{retention_days} days")
  end
end