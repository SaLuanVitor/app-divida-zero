class User < ApplicationRecord
  has_secure_password

  has_many :financial_records, dependent: :destroy
  has_many :financial_goals, dependent: :destroy
  has_many :gamification_events, dependent: :destroy
  has_many :analytics_events, dependent: :destroy
  has_many :notification_alerts, dependent: :destroy

  before_validation :normalize_email

  validates :name,
            presence: { message: "Nome é obrigatório." },
            length: {
              minimum: 2,
              maximum: 120,
              too_short: "Nome deve ter no mínimo %{count} caracteres.",
              too_long: "Nome deve ter no máximo %{count} caracteres."
            }

  validates :email,
            presence: { message: "Usuário é obrigatório." },
            uniqueness: { case_sensitive: false, message: "Usuário já está em uso." }

  validates :password,
            presence: { message: "Senha é obrigatória." },
            length: { minimum: 8, too_short: "Senha deve ter no mínimo %{count} caracteres." },
            allow_nil: true

  def public_payload
    {
      id: id,
      name: name,
      email: email,
      profile_icon_key: profile_icon_key.presence || ProfileAppearanceCatalog::DEFAULT_ICON_KEY,
      profile_frame_key: profile_frame_key.presence || ProfileAppearanceCatalog::DEFAULT_FRAME_KEY
    }
  end

  private

  def normalize_email
    self.email = email.to_s.strip.downcase
  end
end
