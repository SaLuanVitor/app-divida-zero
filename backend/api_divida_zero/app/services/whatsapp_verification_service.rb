class WhatsappVerificationService
  CODE_LENGTH = 6
  CODE_EXPIRY = 10.minutes
  MAX_ATTEMPTS = 3
  MAX_SENDS = 3
  RATE_LIMIT_WINDOW = 1.hour

  class << self
    def send_code(user, phone:)
      phone = normalize_phone(phone || user.phone)
      return { success: false, error: "Telefone inválido" } unless valid_phone?(phone)

      if rate_limited_send?(phone)
        return { success: false, error: "Limite de envios excedido. Tente novamente em 1 hora." }
      end

      code = generate_code
      store_code(phone, code)

      if WhatsappProvider.configured?
        WhatsappProvider.send_text(phone: phone, message: "Seu código de verificação App Dívida Zero: #{code}")
      end

      increment_send_count(phone)
      { success: true, message: "Código enviado para #{phone}" }
    rescue WhatsappProvider::DeliveryFailed => e
      { success: false, error: e.message }
    end

    def verify_code(user, phone:, code:)
      phone = normalize_phone(phone)
      stored = get_stored_code(phone)

      if stored.nil?
        return { success: false, error: "Código expirado. Solicite um novo." }
      end

      if rate_limited_attempt?(phone)
        return { success: false, error: "Muitas tentativas. Solicite um novo código." }
      end

      if stored[:code] != code || Time.current > stored[:expires_at]
        increment_attempt_count(phone)
        return { success: false, error: "Código inválido ou expirado." }
      end

      user.update!(phone: phone, phone_verified: true, wa_opt_in_at: Time.current)
      user.update_wa_preferences!("wa_notifications_enabled" => true)
      clear_code(phone)

      { success: true, message: "Telefone verificado com sucesso!" }
    end

    private

    def generate_code
      format("%0#{CODE_LENGTH}d", rand(10**(CODE_LENGTH - 1)..10**CODE_LENGTH - 1))
    end

    def store_code(phone, code)
      Rails.cache.write(cache_key(phone), { code: code, expires_at: CODE_EXPIRY.from_now }, expires_in: CODE_EXPIRY)
    end

    def get_stored_code(phone)
      Rails.cache.read(cache_key(phone))
    end

    def clear_code(phone)
      Rails.cache.delete(cache_key(phone))
    end

    def cache_key(phone)
      "wa_verification:#{phone}"
    end

    def rate_limited_send?(phone)
      count = Rails.cache.read(send_count_key(phone)).to_i
      count >= MAX_SENDS
    end

    def increment_send_count(phone)
      count = Rails.cache.read(send_count_key(phone)).to_i
      Rails.cache.write(send_count_key(phone), count + 1, expires_in: RATE_LIMIT_WINDOW)
    end

    def rate_limited_attempt?(phone)
      count = Rails.cache.read(attempt_count_key(phone)).to_i
      count >= MAX_ATTEMPTS
    end

    def increment_attempt_count(phone)
      count = Rails.cache.read(attempt_count_key(phone)).to_i
      Rails.cache.write(attempt_count_key(phone), count + 1, expires_in: RATE_LIMIT_WINDOW)
    end

    def send_count_key(phone)
      "wa_verification:send_count:#{phone}"
    end

    def attempt_count_key(phone)
      "wa_verification:attempt_count:#{phone}"
    end

    def normalize_phone(phone)
      phone.to_s.gsub(/[^\d+]/, "")
    end

    def valid_phone?(phone)
      phone.match?(/\A\+?\d{10,15}\z/)
    end
  end
end
