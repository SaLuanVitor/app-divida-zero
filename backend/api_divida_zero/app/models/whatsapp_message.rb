class WhatsappMessage < ApplicationRecord
  self.table_name = "whatsapp_messages"

  belongs_to :user
  belongs_to :notification_alert, optional: true

  STATUSES = %w[pending sent delivered read failed rejected].freeze
  CATEGORIES = %w[authentication utility marketing].freeze

  validates :template_name, presence: true
  validates :status, inclusion: { in: STATUSES }
  validates :category, inclusion: { in: CATEGORIES }
  validates :provider_message_id, uniqueness: true, allow_nil: true

  scope :today, -> { where(created_at: Date.current.all_day) }
  scope :by_status, ->(status) { where(status: status) }
  scope :failed, -> { where(status: %w[failed rejected]) }
  scope :recent, -> { order(created_at: :desc) }

  def can_transition_to?(new_status)
    case status
    when "pending" then %w[sent failed].include?(new_status)
    when "sent" then %w[delivered failed rejected].include?(new_status)
    when "delivered" then %w[read failed].include?(new_status)
    when "read", "failed", "rejected" then false
    end
  end

  def transition_to!(new_status, error: nil)
    return false unless can_transition_to?(new_status)

    attrs = { status: new_status, error_message: error }
    attrs[:sent_at] = Time.current if new_status == "sent" && sent_at.nil?
    update!(attrs)
    true
  end
end
