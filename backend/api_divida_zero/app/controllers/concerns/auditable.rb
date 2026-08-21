module Auditable
  extend ActiveSupport::Concern

  private

  def audit_log!(action, resource: nil, metadata: {})
    AuditLog.create!(
      user: current_user_for_audit,
      action: action,
      resource_type: resource&.class&.name,
      resource_id: resource&.id,
      ip: request.remote_ip,
      user_agent: request.user_agent,
      metadata: metadata
    )
  rescue StandardError => e
    Rails.logger.error("AuditLog failed: #{e.message}")
    Rails.logger.error(e.backtrace.join("\n"))
  end

  def current_user_for_audit
    @current_user if respond_to?(:@current_user) && @current_user&.persisted?
  end
end