class HouseholdMembership < ApplicationRecord
  ROLES = %w[owner member].freeze

  belongs_to :household
  belongs_to :user

  validates :role, inclusion: { in: ROLES, message: "Papel inválido." }
  validates :household_id, uniqueness: { scope: :user_id, message: "Usuário já é membro desta família." }
end
