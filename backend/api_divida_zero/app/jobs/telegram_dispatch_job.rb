class TelegramDispatchJob < ApplicationJob
  queue_as :default

  def perform(notification_alert_id)
    alert = NotificationAlert.find_by(id: notification_alert_id)
    return unless alert

    user = alert.user
    return unless TelegramChannel.valid_recipient?(user, alert.alert_type)

    result = TelegramChannel.deliver(user: user, alert: alert)

    Rails.logger.warn "[TelegramDispatch] Delivery failed for alert #{alert.id}: #{result.error}" unless result.success?
  end
end
