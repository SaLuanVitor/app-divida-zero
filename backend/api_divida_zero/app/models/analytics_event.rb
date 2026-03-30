class AnalyticsEvent < ApplicationRecord
  belongs_to :user

  EVENT_ALLOWLIST = %w[
    app_opened
    onboarding_viewed
    onboarding_skipped
    onboarding_completed
    tutorial_reopened
    login_success
    record_created
    record_paid_or_received
    goal_created
    reports_viewed
  ].freeze

  validates :event_name, inclusion: { in: EVENT_ALLOWLIST, message: "Evento de analytics inválido." }
  validates :session_id, presence: { message: "Sessão é obrigatória." }
  validates :screen, length: { maximum: 80 }, allow_blank: true
end
