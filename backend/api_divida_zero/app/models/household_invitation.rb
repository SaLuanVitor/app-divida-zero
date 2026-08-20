class HouseholdInvitation < ApplicationRecord
  STATUSES = %w[pending accepted declined expired].freeze

  belongs_to :household
  belongs_to :invited_by, class_name: "User"

  before_create :generate_token, :set_expiration

  validates :email, presence: { message: "Email é obrigatório." }
  validates :status, inclusion: { in: STATUSES, message: "Status inválido." }
  validates :email, uniqueness: { scope: :household_id, message: "Já existe um convite pendente para este email.", conditions: -> { where(status: "pending") } }

  scope :pending, -> { where(status: "pending") }

  def expired?
    expires_at.past?
  end

  def accept!
    update!(status: "accepted")
  end

  def decline!
    update!(status: "declined")
  end

  private

  def generate_token
    self.token = SecureRandom.hex(20) if token.blank?
  end

  def set_expiration
    self.expires_at = 7.days.from_now if expires_at.blank?
  end
end
