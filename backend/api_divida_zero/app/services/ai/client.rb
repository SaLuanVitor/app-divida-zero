require "net/http"
require "uri"
require "json"

module Ai
  class Client
    DEFAULT_MODEL = "gpt-4.1-mini".freeze

    class << self
      def generate_json(feature:, system_prompt:, user_prompt:, fallback:, response_guard:)
        started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        api_key = ENV["OPENAI_API_KEY"].to_s.strip
        model = ENV["OPENAI_MODEL"].to_s.strip.presence || DEFAULT_MODEL
        provider = "openai"

        return fallback_response(fallback, feature, started_at, model, provider) if api_key.blank?

        uri = URI.parse("https://api.openai.com/v1/chat/completions")
        request = Net::HTTP::Post.new(uri)
        request["Authorization"] = "Bearer #{api_key}"
        request["Content-Type"] = "application/json"
        request.body = {
          model: model,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system_prompt },
            { role: "user", content: user_prompt }
          ]
        }.to_json

        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = true
        http.open_timeout = 4
        http.read_timeout = 9
        response = http.request(request)
        payload = JSON.parse(response.body)
        raw_content = payload.dig("choices", 0, "message", "content").to_s
        guarded_content = response_guard.call(raw_content)
        usage = payload["usage"] || {}

        {
          ok: true,
          source: "llm",
          provider: provider,
          model: model,
          content: guarded_content,
          prompt_tokens: usage["prompt_tokens"].to_i,
          completion_tokens: usage["completion_tokens"].to_i,
          total_tokens: usage["total_tokens"].to_i,
          latency_ms: elapsed_ms(started_at)
        }
      rescue StandardError => error
        fallback_response(fallback, feature, started_at, model, provider, error.message.to_s.slice(0, 180))
      end

      private

      def fallback_response(fallback, feature, started_at, model, provider, error_message = nil)
        fallback_payload =
          if fallback.respond_to?(:call)
            fallback.call(feature)
          else
            fallback
          end

        {
          ok: false,
          source: "fallback",
          provider: provider,
          model: model,
          content: fallback_payload,
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          latency_ms: elapsed_ms(started_at),
          error_message: error_message
        }
      end

      def elapsed_ms(started_at)
        ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at) * 1000).round
      end
    end
  end
end
