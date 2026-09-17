class PushDispatchJob < ApplicationJob
  queue_as :default

  def perform(notification_alert_id)
    alert = NotificationAlert.find_by(id: notification_alert_id)
    return unless alert

    user = alert.user
    return unless PushChannel.valid_recipient?(user)

    PushChannel.deliver(user: user, alert: alert)
  end
end
