class AiInteraction < ApplicationRecord
  FEATURES = %w[next_action alerts categorize_record reports_briefing daily_message].freeze
  STATUSES = %w[success fallback error].freeze

  belongs_to :user
  has_many :ai_feedbacks, dependent: :destroy

  validates :feature, inclusion: { in: FEATURES, message: "Feature invalida." }
  validates :status, inclusion: { in: STATUSES, message: "Status invalido." }
  validates :prompt_version, presence: true
end
