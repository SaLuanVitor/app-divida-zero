class TelegramLinkToken
  TYPE = "telegram_link".freeze
  TTL = 30.minutes

  class << self
    def issue(user_id:)
      JsonWebToken.encode(sub: user_id, type: TYPE, exp: TTL.from_now.to_i)
    end

    def decode(token)
      payload = JsonWebToken.decode(token, expected_type: TYPE)
      payload["sub"]
    rescue JWT::DecodeError
      nil
    end
  end
end
