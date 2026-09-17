class FinancialGoal < ApplicationRecord
  GOAL_TYPES = %w[save debt specific].freeze
  STATUSES = %w[active completed].freeze

  belongs_to :user
  belongs_to :household, optional: true
  has_many :financial_goal_contributions, dependent: :destroy

  scope :shared_with_household, -> { where.not(household_id: nil) }
  scope :personal, -> { where(household_id: nil) }

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

  validates :household_id, presence: { message: "Família é obrigatória para meta compartilhada." }, if: :shared?

  def shared?
    household_id.present?
  end

  def serialize(current_user: nil)
    contributor_list = financial_goal_contributions
      .includes(:user)
      .where.not(user: nil)
      .distinct
      .map { |c| { id: c.user_id, name: c.user.name } }
      .uniq { |c| c[:id] }

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
      completed_at: completed_at,
      user_name: user.name,
      shared: shared?,
      household_id: household_id,
      contributors: contributor_list,
      can_contribute: current_user.nil? || !shared? || household&.member?(current_user)
    }
  end

  def remaining_amount
    remaining = target_amount.to_d - current_amount.to_d
    remaining.positive? ? remaining : 0.to_d
  end
end

