class JsonWebToken
  ALGORITHM = "HS256".freeze
  ACCESS_TTL = 15.minutes
  REFRESH_TTL = 30.days

  class << self
    def issue_pair(user_id:)
      {
        access_token: encode(sub: user_id, type: "access", exp: ACCESS_TTL.from_now.to_i),
        refresh_token: encode(sub: user_id, type: "refresh", exp: REFRESH_TTL.from_now.to_i)
      }
    end

    def encode(payload)
      JWT.encode(payload.merge(iat: Time.current.to_i), secret_key, ALGORITHM)
    end

    def decode(token, expected_type: nil)
      decoded_payload, = JWT.decode(token, secret_key, true, algorithm: ALGORITHM)

      if expected_type && decoded_payload["type"] != expected_type
        raise JWT::DecodeError, "Invalid token type"
      end

      decoded_payload
    rescue JWT::ExpiredSignature
      raise JWT::DecodeError, "Token expired"
    end

    private

    def secret_key
      Rails.application.secret_key_base
    end
  end
end
