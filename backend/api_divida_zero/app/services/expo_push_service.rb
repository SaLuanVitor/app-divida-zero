require "net/http"
require "uri"
require "json"

class ExpoPushService
  EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send".freeze
  BATCH_SIZE = 100

  class << self
    def deliver(tokens:, title:, body:, data: {})
      normalized_tokens = Array(tokens).map { |token| token.to_s.strip }.reject(&:blank?).uniq
      return { delivered: 0, removed_tokens: [] } if normalized_tokens.empty?

      removed_tokens = []
      delivered = 0

      normalized_tokens.each_slice(BATCH_SIZE) do |batch|
        messages = batch.map do |token|
          {
            to: token,
            title: title.to_s,
            body: body.to_s,
            sound: "default",
            data: data
          }
        end

        response_items = post_messages(messages)
        response_items.each_with_index do |item, index|
          if item["status"] == "ok"
            delivered += 1
          elsif device_not_registered?(item)
            removed_tokens << batch[index]
          end
        end
      end

      if removed_tokens.any?
        DeviceToken.where(expo_push_token: removed_tokens).delete_all
      end

      { delivered: delivered, removed_tokens: removed_tokens }
    end

    private

    def post_messages(messages)
      uri = URI.parse(EXPO_PUSH_URL)
      request = Net::HTTP::Post.new(uri)
      request["Accept"] = "application/json"
      request["Accept-Encoding"] = "gzip, deflate"
      request["Content-Type"] = "application/json"
      request.body = messages.to_json

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.open_timeout = 4
      http.read_timeout = 9
      response = http.request(request)
      payload = JSON.parse(response.body)
      Array(payload["data"])
    rescue StandardError => e
      Rails.logger.error "[ExpoPush] Failed to send messages: #{e.message}"
      []
    end

    def device_not_registered?(item)
      details = item["details"]
      return false unless details.is_a?(Hash)

      details["error"].to_s == "DeviceNotRegistered"
    end
  end
end
