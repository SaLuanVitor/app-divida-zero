class WhatsappProvider
  AdapterNotConfigured = Class.new(StandardError)
  DeliveryFailed = Class.new(StandardError)
  RateLimitExceeded = Class.new(StandardError)

  class Result
    attr_reader :success, :provider_message_id, :error, :retry_after

    def initialize(success:, provider_message_id: nil, error: nil, retry_after: nil)
      @success = success
      @provider_message_id = provider_message_id
      @error = error
      @retry_after = retry_after
    end

    def success?
      @success
    end

    def rate_limited?
      @retry_after.present?
    end
  end

  class << self
    def adapter
      provider = ENV.fetch("WHATSAPP_PROVIDER", nil)
      raise AdapterNotConfigured, "WHATSAPP_PROVIDER not set" if provider.blank?

      adapter_class = "WhatsappProvider::#{provider.camelize}Adapter".safe_constantize
      raise AdapterNotConfigured, "Unknown provider: #{provider}" unless adapter_class

      adapter_class
    end

    def send_template(phone:, template_name:, template_params:, language: "pt_BR")
      adapter.new.send_template(
        phone: phone,
        template_name: template_name,
        template_params: template_params,
        language: language
      )
    end

    def send_text(phone:, message:)
      adapter.new.send_text(phone: phone, message: message)
    end

    def verify_credentials!
      adapter.new.verify_credentials!
    end

    def fetch_templates
      adapter.new.fetch_templates
    end

    def phone_number_id
      ENV.fetch("WHATSAPP_PHONE_ID", nil)
    end

    def configured?
      ENV["WHATSAPP_PROVIDER"].present? && ENV["WHATSAPP_API_KEY"].present?
    end
  end
end
