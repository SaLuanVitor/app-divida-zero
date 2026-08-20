class DeviceToken < ApplicationRecord
  PLATFORMS = %w[android ios web].freeze

  belongs_to :user

  validates :expo_push_token,
            presence: { message: "Token push é obrigatório." },
            uniqueness: { message: "Token push já registrado." }
  validates :platform, inclusion: { in: PLATFORMS, message: "Plataforma inválida." }
  validates :last_seen_at, presence: { message: "Último acesso é obrigatório." }

  scope :for_user, ->(user) { where(user: user) }

  def touch_last_seen!(at: Time.current)
    update!(last_seen_at: at)
  end
end
