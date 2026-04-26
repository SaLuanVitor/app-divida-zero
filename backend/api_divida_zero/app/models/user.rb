class User < ApplicationRecord
  ROLES = %w[user admin].freeze

  has_secure_password

  has_many :financial_records, dependent: :destroy
  has_many :financial_goals, dependent: :destroy
  has_many :financial_goal_contributions, through: :financial_goals
  has_many :gamification_events, dependent: :destroy
  has_many :analytics_events, dependent: :destroy
  has_many :notification_alerts, dependent: :destroy
  has_many :app_ratings, dependent: :destroy
  has_many :ai_interactions, dependent: :destroy
  has_many :ai_feedbacks, dependent: :destroy
  has_many :ai_usage_counters, dependent: :destroy

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

  validates :role, inclusion: { in: ROLES, message: "Papel inválido." }

  scope :admins, -> { where(role: "admin") }
  scope :active_users, -> { where(active: true) }

  def public_payload
    {
      id: id,
      name: name,
      email: email,
      role: role,
      active: active,
      force_password_change: force_password_change,
      profile_icon_key: profile_icon_key.presence || ProfileAppearanceCatalog::DEFAULT_ICON_KEY,
      profile_frame_key: profile_frame_key.presence || ProfileAppearanceCatalog::DEFAULT_FRAME_KEY
    }
  end

  private

  def normalize_email
    self.email = email.to_s.strip.downcase
  end
end
