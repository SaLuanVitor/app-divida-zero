class GamificationEvent < ApplicationRecord
  belongs_to :user

  EVENT_TYPES = %w[
    record_created
    income_received
    expense_paid
    record_deleted
    achievement_unlocked
  ].freeze

  validates :event_type, inclusion: { in: EVENT_TYPES, message: "Evento de gamificacao invalido." }
  validates :points, numericality: { only_integer: true, message: "Pontuacao invalida." }
end
