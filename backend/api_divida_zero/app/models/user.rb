class User < ApplicationRecord
  ROLES = %w[user admin].freeze

  has_secure_password

  has_many :household_memberships, dependent: :destroy
  has_many :households, through: :household_memberships
  has_many :sent_invitations, class_name: "HouseholdInvitation", foreign_key: :invited_by_id, dependent: :destroy

  has_many :financial_records, dependent: :destroy
  has_many :financial_goals, dependent: :destroy
  has_many :financial_goal_contributions, through: :financial_goals
  has_many :gamification_events, dependent: :destroy
  has_many :analytics_events, dependent: :destroy
  has_many :notification_alerts, dependent: :destroy
  has_many :device_tokens, dependent: :destroy
  has_many :whatsapp_messages, dependent: :destroy
  has_many :imported_transactions, dependent: :destroy

  WA_PREFERENCE_DEFAULTS = {
    "wa_notifications_enabled" => false,
    "wa_due_reminders" => true,
    "wa_weekly_summary" => true,
    "wa_dnd_start" => "22:00",
    "wa_dnd_end" => "08:00"
  }.freeze

  EMAIL_PREFERENCE_DEFAULTS = {
    "email_notifications_enabled" => true,
    "email_due_reminders" => true,
    "email_weekly_summary" => true
  }.freeze

  PUSH_PREFERENCE_DEFAULTS = {
    "notifications_enabled" => true,
    "device_push_enabled" => true,
    "notify_due_today" => true,
    "notify_due_tomorrow" => true,
    "notify_weekly_summary" => true
  }.freeze
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

  def push_preferences_with_defaults
    PUSH_PREFERENCE_DEFAULTS.merge(push_preferences.stringify_keys)
  end

  def update_push_preferences!(raw_preferences)
    return if raw_preferences.blank?

    allowed = PUSH_PREFERENCE_DEFAULTS.keys
    incoming = raw_preferences.to_h.stringify_keys.slice(*allowed)
    return if incoming.empty?

    update!(push_preferences: push_preferences_with_defaults.merge(incoming))
  end

  def email_preferences_with_defaults
    EMAIL_PREFERENCE_DEFAULTS.merge(email_notification_preferences.stringify_keys)
  end

  def update_email_preferences!(raw_preferences)
    return if raw_preferences.blank?

    allowed = EMAIL_PREFERENCE_DEFAULTS.keys
    incoming = raw_preferences.to_h.stringify_keys.slice(*allowed)
    return if incoming.empty?

    update!(email_notification_preferences: email_preferences_with_defaults.merge(incoming))
  end

  def wa_preferences_with_defaults
    WA_PREFERENCE_DEFAULTS.merge(wa_notification_preferences.stringify_keys)
  end

  def update_wa_preferences!(raw_preferences)
    return if raw_preferences.blank?

    allowed = WA_PREFERENCE_DEFAULTS.keys
    incoming = raw_preferences.to_h.stringify_keys.slice(*allowed)
    return if incoming.empty?

    update!(wa_notification_preferences: wa_preferences_with_defaults.merge(incoming))
  end

  def wa_enabled_for_alert?(alert_type)
    prefs = wa_preferences_with_defaults
    return false unless ActiveModel::Type::Boolean.new.cast(prefs["wa_notifications_enabled"])
    return false unless phone_verified?

    case alert_type.to_s
    when "due_today", "near_due", "overdue"
      ActiveModel::Type::Boolean.new.cast(prefs["wa_due_reminders"])
    when "weekly_summary"
      ActiveModel::Type::Boolean.new.cast(prefs["wa_weekly_summary"])
    else
      true
    end
  end

  def daily_wa_count
    return 0 unless persisted?

    whatsapp_messages.where(created_at: Date.current.all_day).count
  rescue StandardError
    0
  end

  def email_enabled_for_alert?(alert_type)
    prefs = email_preferences_with_defaults
    return false unless ActiveModel::Type::Boolean.new.cast(prefs["email_notifications_enabled"])

    case alert_type.to_s
    when "due_today", "near_due", "overdue"
      ActiveModel::Type::Boolean.new.cast(prefs["email_due_reminders"])
    when "weekly_summary"
      ActiveModel::Type::Boolean.new.cast(prefs["email_weekly_summary"])
    else
      true
    end
  end

  def push_enabled_for_alert?(alert_type)
    prefs = push_preferences_with_defaults
    return false unless ActiveModel::Type::Boolean.new.cast(prefs["notifications_enabled"])
    return false unless ActiveModel::Type::Boolean.new.cast(prefs["device_push_enabled"])

    case alert_type.to_s
    when "due_today"
      ActiveModel::Type::Boolean.new.cast(prefs["notify_due_today"])
    when "near_due"
      ActiveModel::Type::Boolean.new.cast(prefs["notify_due_tomorrow"])
    when "weekly_summary"
      ActiveModel::Type::Boolean.new.cast(prefs["notify_weekly_summary"])
    else
      true
    end
  end

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
