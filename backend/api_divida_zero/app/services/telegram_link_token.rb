class TelegramLinkToken
  TTL = 30.minutes
  # Token curto (32 chars hex) porque o deep link ?start= do Telegram aceita
  # no maximo 64 caracteres. Um JWT completo (~155 chars) era truncado/descartado.
  TOKEN_BYTES = 16

  class << self
    def issue(user_id:)
      token = SecureRandom.hex(TOKEN_BYTES)
      Rails.cache.write(cache_key(token), user_id, expires_in: TTL)
      token
    end

    def decode(token)
      return nil if token.blank?

      Rails.cache.read(cache_key(token))
    rescue StandardError
      nil
    end

    private

    def cache_key(token)
      "telegram_link_token/#{token}"
    end
  end
end
