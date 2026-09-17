class EmailChannel < ApplicationChannel
  class << self
    def channel_name
      "email"
    end

    def deliver(user:, alert:)
      case alert.alert_type
      when "due_today", "near_due", "overdue"
        NotificationMailer.due_reminder(user, alert).deliver_now
      when "weekly_summary"
        NotificationMailer.weekly_summary(user, alert).deliver_now
      when "weekly_evolution"
        NotificationMailer.weekly_evolution(user, alert).deliver_now
      end

      ApplicationChannel::DeliverResult.new(success: true, message_id: "#{channel_name}-#{alert.id}")
    rescue StandardError => e
      ApplicationChannel::DeliverResult.new(success: false, error: e.message)
    end

    def valid_recipient?(user, alert_type = "due_today")
      user.email_enabled_for_alert?(alert_type)
    end
  end
end
