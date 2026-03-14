class FinancialGoal < ApplicationRecord
  GOAL_TYPES = %w[save debt specific].freeze
  STATUSES = %w[active completed].freeze

  belongs_to :user

  validates :title,
            presence: { message: "Título é obrigatório." },
            length: {
              minimum: 2,
              maximum: 120,
              too_short: "Título deve ter no mínimo %{count} caracteres.",
              too_long: "Título deve ter no máximo %{count} caracteres."
            }

  validates :target_amount,
            presence: { message: "Valor da meta é obrigatório." },
            numericality: { greater_than: 0, message: "Valor da meta deve ser maior que zero." }

  validates :start_date,
            presence: { message: "Data de início é obrigatória." }

  validates :goal_type,
            presence: { message: "Tipo da meta é obrigatório." },
            inclusion: { in: GOAL_TYPES, message: "Tipo da meta inválido." }

  validates :status,
            presence: true,
            inclusion: { in: STATUSES, message: "Status da meta inválido." }

  def serialize
    {
      id: id,
      title: title,
      description: description,
      target_amount: target_amount.to_s,
      current_amount: current_amount.to_s,
      remaining_amount: remaining_amount.to_s,
      progress_pct: progress_pct,
      goal_type: goal_type,
      status: status,
      start_date: start_date,
      target_date: target_date,
      completed_at: completed_at
    }
  end

  def remaining_amount
    remaining = target_amount.to_d - current_amount.to_d
    remaining.positive? ? remaining : 0.to_d
  end
end

