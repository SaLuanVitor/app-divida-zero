class EmailDispatchJob < ApplicationJob
  queue_as :default

  def perform(notification_alert_id)
    alert = NotificationAlert.find_by(id: notification_alert_id)
    return unless alert

    user = alert.user
    return unless EmailChannel.valid_recipient?(user, alert.alert_type)

    EmailChannel.deliver(user: user, alert: alert)
  end
end
