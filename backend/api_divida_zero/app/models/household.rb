class Household < ApplicationRecord
  has_many :household_memberships, dependent: :destroy
  has_many :users, through: :household_memberships
  has_many :household_invitations, dependent: :destroy
  has_many :financial_records, dependent: :nullify
  has_many :financial_goals, dependent: :nullify

  before_create :generate_invite_code

  validates :name, presence: { message: "Nome é obrigatório." }

  def owner
    household_memberships.find_by(role: "owner")&.user
  end

  def member?(user)
    household_memberships.exists?(user_id: user.id)
  end

  def owner?(user)
    household_memberships.exists?(user_id: user.id, role: "owner")
  end

  private

  def generate_invite_code
    self.invite_code = SecureRandom.hex(6) if invite_code.blank?
  end
end
