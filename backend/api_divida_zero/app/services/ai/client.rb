require "net/http"
require "uri"
require "json"

module Ai
  class Client
    DEFAULT_MODEL = "gpt-4.1-mini".freeze
    DEFAULT_BASE_URL = "https://api.openai.com/v1".freeze
    APP_TITLE = "App Divida Zero".freeze
    APP_REFERER = "https://appdividazero.com.br".freeze

    class << self
      def generate_json(feature:, system_prompt:, user_prompt:, fallback:, response_guard:)
        started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        api_key = resolve_api_key
        model = resolve_model
        base_url = resolve_base_url
        provider = resolve_provider(base_url)

        return fallback_response(fallback, feature, started_at, model, provider) if api_key.blank?

        attempts = 0
        last_error = nil

        begin
          attempts += 1
          perform_request(
            feature: feature,
            system_prompt: system_prompt,
            user_prompt: user_prompt,
            response_guard: response_guard,
            started_at: started_at,
            api_key: api_key,
            model: model,
            base_url: base_url,
            provider: provider
          )
        rescue StandardError => error
          last_error = error.message.to_s.slice(0, 180)
          retry if attempts < 3 && retryable?(error)
          fallback_response(fallback, feature, started_at, model, provider, last_error)
        end
      end

      private

      RETRYABLE_ERRORS = [
        Errno::ECONNRESET, Errno::ETIMEDOUT, Errno::EPIPE,
        Timeout::Error, Net::OpenTimeout, Net::ReadTimeout,
        Net::HTTPTooManyRequests, Net::HTTPServerError
      ].freeze

      def retryable?(error)
        RETRYABLE_ERRORS.any? { |klass| error.is_a?(klass) }
      end

      def perform_request(feature:, system_prompt:, user_prompt:, response_guard:, started_at:, api_key:, model:, base_url:, provider:)
        uri = URI.parse("#{base_url}/chat/completions")
        request = Net::HTTP::Post.new(uri)
        request["Authorization"] = "Bearer #{api_key}"
        request["Content-Type"] = "application/json"

        if provider == "openrouter"
          request["HTTP-Referer"] = APP_REFERER
          request["X-Title"] = APP_TITLE
        end

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
      end

      def resolve_api_key
        ENV["AI_API_KEY"].to_s.strip.presence || ENV["OPENAI_API_KEY"].to_s.strip
      end

      def resolve_model
        ENV["AI_MODEL"].to_s.strip.presence || ENV["OPENAI_MODEL"].to_s.strip.presence || DEFAULT_MODEL
      end

      def resolve_base_url
        raw = ENV["AI_BASE_URL"].to_s.strip.presence || DEFAULT_BASE_URL
        raw.chomp("/")
      end

      def resolve_provider(base_url)
        base_url.to_s.include?("openrouter") ? "openrouter" : "openai"
      end

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
