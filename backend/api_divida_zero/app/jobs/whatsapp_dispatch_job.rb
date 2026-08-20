class WhatsappDispatchJob < ApplicationJob
  queue_as :whatsapp

  retry_on WhatsappProvider::RateLimitExceeded, wait: :exponentially_longer, attempts: 3
  retry_on WhatsappProvider::DeliveryFailed, wait: :polynomially_longer, attempts: 3
  discard_on StandardError do |job, error|
    alert = NotificationAlert.find_by(id: job.arguments.first)
    Rails.logger.error "[WhatsAppDispatch] Permanently failed for alert #{alert&.id}: #{error.message}"
  end

  def perform(notification_alert_id)
    alert = NotificationAlert.find_by(id: notification_alert_id)
    return unless alert

    user = alert.user
    return unless WhatsappChannel.valid_recipient?(user)

    result = WhatsappChannel.deliver(user: user, alert: alert)

    unless result.success?
      Rails.logger.warn "[WhatsAppDispatch] Delivery failed for alert #{alert.id}: #{result.error}"
    end
  end
end
