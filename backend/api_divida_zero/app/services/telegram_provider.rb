require "net/http"
require "uri"
require "json"

class TelegramProvider
  DeliveryFailed = Class.new(StandardError)
  RateLimitExceeded = Class.new(StandardError)
  NotConfigured = Class.new(StandardError)

  BASE_URL = "https://api.telegram.org".freeze

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
    def configured?
      ENV["TELEGRAM_BOT_TOKEN"].present?
    end

    def bot_username
      ENV["TELEGRAM_BOT_USERNAME"]
    end

    def send_message(chat_id:, text:)
      token = ENV["TELEGRAM_BOT_TOKEN"]
      raise NotConfigured, "TELEGRAM_BOT_TOKEN not set" if token.blank?

      post("sendMessage", token, { chat_id: chat_id, text: text })
    end

    def verify_credentials!
      token = ENV["TELEGRAM_BOT_TOKEN"]
      raise NotConfigured, "TELEGRAM_BOT_TOKEN not set" if token.blank?

      post("getMe", token, {})
    end

    private

    def post(method, token, body)
      uri = URI.parse("#{BASE_URL}/bot#{token}/#{method}")
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.open_timeout = 5
      http.read_timeout = 10

      request = Net::HTTP::Post.new(uri.request_uri, { "Content-Type" => "application/json" })
      request.body = body.to_json

      response = http.request(request)

      case response.code.to_i
      when 200
        data = JSON.parse(response.body)
        if data["ok"]
          Result.new(success: true, provider_message_id: data.dig("result", "message_id"))
        else
          Result.new(success: false, error: data["description"])
        end
      when 429
        retry_after = (response["Retry-After"] || 30).to_i
        Result.new(success: false, error: "Rate limited", retry_after: retry_after)
      when 400, 403, 404
        data = safe_parse(response.body)
        Result.new(success: false, error: data["description"] || "HTTP #{response.code}")
      else
        Result.new(success: false, error: "HTTP #{response.code}")
      end
    rescue Net::OpenTimeout, Net::ReadTimeout, SocketError, Errno::ECONNREFUSED => e
      Result.new(success: false, error: e.message)
    end

    def safe_parse(body)
      JSON.parse(body)
    rescue JSON::ParserError
      {}
    end
  end
end
