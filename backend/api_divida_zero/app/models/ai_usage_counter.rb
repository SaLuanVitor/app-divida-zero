class AiUsageCounter < ApplicationRecord
  PERIOD_TYPES = %w[daily monthly].freeze

  belongs_to :user

  validates :period_type, inclusion: { in: PERIOD_TYPES, message: "Periodo invalido." }
  validates :period_start, presence: true
  validates :requests_count, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :tokens_count, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
end
