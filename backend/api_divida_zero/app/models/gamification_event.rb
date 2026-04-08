class GamificationEvent < ApplicationRecord
  belongs_to :user

  EVENT_TYPES = %w[
    record_created
    income_received
    expense_paid
    record_deleted
    achievement_unlocked
    goal_created
    goal_progress_milestone
    goal_completed
    goal_deleted
    daily_achievement_completed
  ].freeze

  validates :event_type, inclusion: { in: EVENT_TYPES, message: "Evento de gamificação inválido." }
  validates :points, numericality: { only_integer: true, message: "Pontuação inválida." }
end
