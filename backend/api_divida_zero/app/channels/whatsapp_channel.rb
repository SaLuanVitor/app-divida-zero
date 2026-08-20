class WhatsappChannel < ApplicationChannel
  class << self
    def channel_name
      "whatsapp"
    end

    def deliver(user:, alert:, template_params: nil)
      unless WhatsappProvider.configured?
        Rails.logger.info "[WhatsAppChannel] Provider not configured. Skipping."
        return DeliverResult.new(success: true, message_id: nil)
      end

      if dnd_active?(user)
        Rails.logger.info "[WhatsAppChannel] DND active for user #{user.id}. Skipping."
        return DeliverResult.new(success: true, message_id: nil)
      end

      if global_daily_cap_reached?
        Rails.logger.warn "[WhatsAppChannel] Global daily cap reached. Skipping."
        return DeliverResult.new(success: false, error: "Global daily cap reached")
      end

      return DeliverResult.new(success: false, error: "Daily cap reached") if user.daily_wa_count >= daily_cap_per_user

      rate_check = rate_limiter.allow?(user.phone)
      return DeliverResult.new(success: false, error: "Rate limited", message_id: nil) unless rate_check[:allowed]

      template_name = template_for(alert.alert_type)
      return DeliverResult.new(success: false, error: "No template for #{alert.alert_type}") unless template_name

      result = WhatsappProvider.send_template(
        phone: user.phone,
        template_name: template_name,
        template_params: template_params || build_params(alert)
      )

      track_message(user, alert, result) if result.success?

      result.success? ? result : DeliverResult.new(success: false, error: result.error)
    rescue WhatsappProvider::RateLimitExceeded => e
      handle_rate_limit(user, e)
      DeliverResult.new(success: false, error: e.message)
    rescue StandardError => e
      DeliverResult.new(success: false, error: e.message)
    end

    def valid_recipient?(user)
      return false unless user.phone_verified?
      return false unless user.wa_enabled_for_alert?("due_today")

      user.daily_wa_count < daily_cap_per_user
    end

    def rate_limiter
      @rate_limiter ||= WhatsappRateLimiter.instance
    end

    private

    def dnd_active?(user)
      return false unless user.respond_to?(:wa_preferences_with_defaults)

      prefs = user.wa_preferences_with_defaults
      dnd_start = prefs["wa_dnd_start"] || "22:00"
      dnd_end = prefs["wa_dnd_end"] || "08:00"

      now = Time.current.in_time_zone("America/Sao_Paulo")
      current_time = now.strftime("%H:%M")

      if dnd_start < dnd_end
        current_time >= dnd_start && current_time < dnd_end
      else
        current_time >= dnd_start || current_time < dnd_end
      end
    end

    def template_for(alert_type)
      case alert_type.to_s
      when "due_today" then "due_reminder"
      when "near_due" then "due_reminder"
      when "overdue" then "overdue_alert"
      when "weekly_summary" then "weekly_summary"
      end
    end

    def build_params(alert)
      case alert.alert_type
      when "weekly_summary"
        [
          alert.user.name,
          alert.metadata["pending_income_total"],
          alert.metadata["pending_expense_total"],
          alert.metadata["projected_balance"]
        ]
      else
        [alert.user.name, alert.due_count.to_s]
      end
    end

    def handle_rate_limit(user, exception)
      retry_after = exception.message.match(/(\d+)/)&.[](1).to_i
      retry_after = 60 if retry_after <= 0

      user.increment!(:wa_consecutive_429_count) if user.respond_to?(:wa_consecutive_429_count)

      if user.wa_consecutive_429_count >= 3
        user.update_wa_preferences!("wa_notifications_enabled" => false)
        Rails.logger.warn "[WhatsAppChannel] Auto-DND triggered for user #{user.id} (3 consecutive 429s)"
      end
    end

    def daily_cap_per_user
      ENV.fetch("WHATSAPP_DAILY_CAP_PER_USER", 10).to_i
    end

    def global_daily_cap
      ENV.fetch("WHATSAPP_DAILY_CAP", 500).to_i
    end

    def global_daily_cap_reached?
      return false unless defined?(WhatsappMessage)

      today_count = WhatsappMessage.today.count
      today_count >= global_daily_cap
    end

    def track_message(user, alert, result)
      return unless defined?(WhatsappMessage)

      WhatsappMessage.create!(
        user: user,
        notification_alert: alert,
        provider_message_id: result.provider_message_id,
        template_name: template_for(alert.alert_type),
        status: "sent",
        category: "utility"
      )
    rescue StandardError => e
      Rails.logger.error "[WhatsAppChannel] Failed to track message: #{e.message}"
    end
  end
end
