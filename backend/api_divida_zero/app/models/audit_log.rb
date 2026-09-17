class AuditLog < ApplicationRecord
  belongs_to :user, optional: true

  serialize :metadata, coder: JSON

  validates :action, presence: true

  scope :recent, -> { order(created_at: :desc).limit(100) }
  scope :for_user, ->(user) { where(user: user) }
  scope :by_action, ->(action) { where(action: action) }
  scope :for_resource, ->(type, id) { where(resource_type: type, resource_id: id) }

  # Cleanup old logs (retention: 90 days)
  def self.cleanup_old_logs!(days: 90)
    where("created_at < ?", days.days.ago).delete_all
  end

  # Actions enum for consistency
  ACTIONS = %w[
    login logout password_change password_reset
    record_create record_update record_delete record_pay
    goal_create goal_update goal_delete goal_contribute
    household_create household_update household_delete
    invitation_create invitation_accept invitation_decline
    admin_user_status_change admin_user_password_reset
    bank_import bank_transaction_accept bank_transaction_reject
    ai_categorize ai_report_briefing
  ].freeze

  validates :action, inclusion: { in: ACTIONS }, if: -> { action.present? }
end