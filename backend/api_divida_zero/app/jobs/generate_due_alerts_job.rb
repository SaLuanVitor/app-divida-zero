class GenerateDueAlertsJob < ApplicationJob
  queue_as :default

  def perform(now_iso8601 = nil)
    now =
      if now_iso8601.present?
        Time.zone.parse(now_iso8601.to_s) || Time.zone.now
      else
        Time.zone.now
      end

    NotificationAlertsService.generate_for_all_users!(now: now)
  end
end

