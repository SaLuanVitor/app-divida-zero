class PushChannel < ApplicationChannel
  class << self
    def channel_name
      "push"
    end

    def deliver(user:, alert:)
      tokens = user.device_tokens.pluck(:expo_push_token)
      return DeliverResult.new(success: true, message_id: nil) if tokens.empty?

      result = ExpoPushService.deliver(
        tokens: tokens,
        title: alert.title,
        body: alert.message,
        data: {
          alert_type: alert.alert_type,
          notification_alert_id: alert.id,
          source: "server_push"
        }
      )

      DeliverResult.new(
        success: result[:delivered].positive?,
        message_id: "#{channel_name}-#{alert.id}"
      )
    end

    def valid_recipient?(user)
      user.push_enabled_for_alert?("due_today")
    end
  end
end
