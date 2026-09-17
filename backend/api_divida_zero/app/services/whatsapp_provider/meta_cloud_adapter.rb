class WhatsappProvider
  class MetaCloudAdapter
    BASE_URL = "https://graph.facebook.com/v22.0".freeze

    def send_template(phone:, template_name:, template_params:, language: "pt_BR")
      body = {
        messaging_product: "whatsapp",
        to: phone.to_s.strip,
        type: "template",
        template: {
          name: template_name,
          language: { code: language },
          components: build_components(template_params)
        }
      }

      post_request("/#{phone_number_id}/messages", body)
    end

    def send_text(phone:, message:)
      body = {
        messaging_product: "whatsapp",
        to: phone.to_s.strip,
        type: "text",
        text: { body: message }
      }

      post_request("/#{phone_number_id}/messages", body)
    end

    def verify_credentials!
      response = get_request("/#{phone_number_id}")
      Result.new(success: true, provider_message_id: response["id"])
    rescue StandardError => e
      Result.new(success: false, error: e.message)
    end

    def fetch_templates
      response = get_request("/#{waba_id}/message_templates?fields=id,name,language,status,components")
      Array(response["data"]).map do |t|
        {
          provider_template_id: t["id"],
          name: t["name"],
          language: t.dig("language", "code"),
          status: t["status"],
          components: t["components"]
        }
      end
    end

    private

    def phone_number_id
      ENV.fetch("WHATSAPP_PHONE_ID")
    end

    def waba_id
      ENV.fetch("WHATSAPP_WABA_ID")
    end

    def api_token
      ENV.fetch("WHATSAPP_API_KEY")
    end

    def build_components(template_params)
      return [] if template_params.blank?

      params = template_params.map.with_index(1) do |value, index|
        { type: "text", text: value.to_s }
      end

      [{ type: "body", parameters: params }]
    end

    def post_request(path, body)
      uri = URI.parse("#{BASE_URL}#{path}")
      request = Net::HTTP::Post.new(uri)
      request["Authorization"] = "Bearer #{api_token}"
      request["Content-Type"] = "application/json"
      request.body = body.to_json

      response = execute_request(uri, request)
      parse_response(response)
    end

    def get_request(path)
      uri = URI.parse("#{BASE_URL}#{path}")
      request = Net::HTTP::Get.new(uri)
      request["Authorization"] = "Bearer #{api_token}"

      response = execute_request(uri, request)
      JSON.parse(response.body)
    end

    def execute_request(uri, request)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.open_timeout = 5
      http.read_timeout = 10

      response = http.request(request)

      case response
      when Net::HTTPTooManyRequests
        retry_after = response["Retry-After"].to_i
        raise RateLimitExceeded, "Rate limited. Retry after #{retry_after}s"
      when Net::HTTPUnauthorized
        raise DeliveryFailed, "Invalid API credentials"
      when Net::HTTPSuccess
        response
      else
        error_body = JSON.parse(response.body) rescue {}
        error_message = error_body.dig("error", "message") || "HTTP #{response.code}"
        raise DeliveryFailed, error_message
      end
    end

    def parse_response(response)
      payload = JSON.parse(response.body)
      message_id = payload.dig("messages", 0, "id")

      Result.new(
        success: true,
        provider_message_id: message_id
      )
    rescue JSON::ParserError => e
      Result.new(success: false, error: "Invalid response: #{e.message}")
    end
  end
end
