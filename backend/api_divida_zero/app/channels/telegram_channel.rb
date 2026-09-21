class TelegramChannel < ApplicationChannel
  class << self
    def channel_name
      "telegram"
    end

    def deliver(user:, alert:)
      unless TelegramProvider.configured?
        Rails.logger.info "[TelegramChannel] Provider not configured. Skipping."
        return ApplicationChannel::DeliverResult.new(success: true, message_id: nil)
      end

      return ApplicationChannel::DeliverResult.new(success: false, error: "No chat_id") if user.telegram_chat_id.blank?

      result = TelegramProvider.send_message(
        chat_id: user.telegram_chat_id,
        text: build_text(alert)
      )

      return result if result.rate_limited? || result.success?

      ApplicationChannel::DeliverResult.new(success: false, error: result.error)
    rescue TelegramProvider::RateLimitExceeded => e
      ApplicationChannel::DeliverResult.new(success: false, error: e.message)
    rescue StandardError => e
      ApplicationChannel::DeliverResult.new(success: false, error: e.message)
    end

    def valid_recipient?(user, alert_type = "due_today")
      return false if user.telegram_chat_id.blank?
      return false if user.telegram_opt_in_at.blank?

      user.telegram_enabled_for_alert?(alert_type)
    end

    private

    def build_text(alert)
      [ alert.title, alert.message ].compact.reject(&:blank?).join("\n")
    end
  end
end
