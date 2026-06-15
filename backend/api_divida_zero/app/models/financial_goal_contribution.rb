class FinancialGoalContribution < ApplicationRecord
  KINDS = %w[deposit withdraw].freeze

  belongs_to :financial_goal

  validates :kind,
            presence: { message: "Tipo do aporte é obrigatório." },
            inclusion: { in: KINDS, message: "Tipo do aporte inválido." }

  validates :amount,
            presence: { message: "Valor do aporte é obrigatório." },
            numericality: { greater_than: 0, message: "Valor do aporte deve ser maior que zero." }

  def signed_amount
    kind == "withdraw" ? -amount.to_d : amount.to_d
  end

  def serialize
    {
      id: id,
      financial_goal_id: financial_goal_id,
      kind: kind,
      amount: amount.to_s,
      notes: notes,
      created_at: created_at
    }
  end
end
