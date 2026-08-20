class WhatsappTemplate < ApplicationRecord
  self.table_name = "whatsapp_templates"

  TEMPLATE_NAMES = %w[due_reminder weekly_summary overdue_alert verification_code].freeze
  STATUSES = %w[pending approved rejected paused].freeze

  validates :name, presence: true, uniqueness: true, inclusion: { in: TEMPLATE_NAMES }
  validates :provider_template_id, presence: true, uniqueness: true
  validates :status, inclusion: { in: STATUSES }

  scope :approved, -> { where(status: "approved") }
  scope :by_name, ->(name) { where(name: name) }

  def approved?
    status == "approved"
  end
end
