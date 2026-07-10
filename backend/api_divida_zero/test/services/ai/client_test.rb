require "test_helper"

module Ai
  class ClientTest < ActiveSupport::TestCase
    setup do
      @original_env = ENV.to_hash
    end

    teardown do
      ENV.replace(@original_env)
    end

    test "falls back to canned response when no api key is configured" do
      clear_ai_env

      result = Ai::Client.generate_json(
        feature: "daily_message",
        system_prompt: "system",
        user_prompt: "user",
        fallback: { "title" => "fallback" },
        response_guard: ->(content) { content }
      )

      assert_equal false, result[:ok]
      assert_equal "fallback", result[:source]
      assert_equal "openai", result[:provider]
      assert_equal Ai::Client::DEFAULT_MODEL, result[:model]
      assert_equal({ "title" => "fallback" }, result[:content])
    end

    test "uses AI_BASE_URL/AI_MODEL/AI_API_KEY and hits the configured openrouter endpoint" do
      clear_ai_env
      ENV["AI_BASE_URL"] = "https://openrouter.ai/api/v1"
      ENV["AI_MODEL"] = "meta-llama/llama-3.3-70b-instruct:free"
      ENV["AI_API_KEY"] = "or-test-key"

      captured_uri = nil
      captured_request = nil
      fake_http = FakeHttp.new(
        Struct.new(:body).new({
          "choices" => [ { "message" => { "content" => "{\"title\":\"ok\"}" } } ],
          "usage" => { "prompt_tokens" => 10, "completion_tokens" => 5, "total_tokens" => 15 }
        }.to_json)
      )

      Net::HTTP.stub(:new, ->(host, port) {
        captured_uri = "#{host}:#{port}"
        fake_http
      }) do
        Net::HTTP::Post.stub(:new, ->(uri) {
          captured_request = FakeRequest.new(uri)
          captured_request
        }) do
          @result = Ai::Client.generate_json(
            feature: "daily_message",
            system_prompt: "system",
            user_prompt: "user",
            fallback: { "title" => "fallback" },
            response_guard: ->(content) { JSON.parse(content) }
          )
        end
      end

      assert_equal true, @result[:ok]
      assert_equal "llm", @result[:source]
      assert_equal "openrouter", @result[:provider]
      assert_equal "meta-llama/llama-3.3-70b-instruct:free", @result[:model]
      assert_equal({ "title" => "ok" }, @result[:content])
      assert_equal "openrouter.ai:443", captured_uri
      assert_equal "https://openrouter.ai/api/v1/chat/completions", captured_request.uri.to_s
      assert_equal "Bearer or-test-key", captured_request.headers["Authorization"]
      assert_equal "App Divida Zero", captured_request.headers["X-Title"]
      assert_equal "https://appdividazero.com.br", captured_request.headers["HTTP-Referer"]
    end

    test "keeps backward compatibility with legacy OPENAI_API_KEY/OPENAI_MODEL and default host" do
      clear_ai_env
      ENV["OPENAI_API_KEY"] = "legacy-key"
      ENV["OPENAI_MODEL"] = "gpt-4o-mini"

      captured_uri = nil
      captured_request = nil
      fake_http = FakeHttp.new(
        Struct.new(:body).new({
          "choices" => [ { "message" => { "content" => "{\"title\":\"ok\"}" } } ],
          "usage" => {}
        }.to_json)
      )

      Net::HTTP.stub(:new, ->(host, port) {
        captured_uri = "#{host}:#{port}"
        fake_http
      }) do
        Net::HTTP::Post.stub(:new, ->(uri) {
          captured_request = FakeRequest.new(uri)
          captured_request
        }) do
          @result = Ai::Client.generate_json(
            feature: "daily_message",
            system_prompt: "system",
            user_prompt: "user",
            fallback: { "title" => "fallback" },
            response_guard: ->(content) { JSON.parse(content) }
          )
        end
      end

      assert_equal true, @result[:ok]
      assert_equal "openai", @result[:provider]
      assert_equal "gpt-4o-mini", @result[:model]
      assert_equal "api.openai.com:443", captured_uri
      assert_equal "https://api.openai.com/v1/chat/completions", captured_request.uri.to_s
      assert_equal "Bearer legacy-key", captured_request.headers["Authorization"]
      assert_nil captured_request.headers["X-Title"]
    end

    private

    def clear_ai_env
      %w[AI_BASE_URL AI_MODEL AI_API_KEY OPENAI_API_KEY OPENAI_MODEL].each { |key| ENV.delete(key) }
    end

    class FakeRequest
      attr_reader :uri, :headers

      def initialize(uri)
        @uri = uri
        @headers = {}
      end

      def []=(key, value)
        @headers[key] = value
      end

      def body=(value)
        @body = value
      end

      attr_reader :body
    end

    class FakeHttp
      attr_accessor :use_ssl, :open_timeout, :read_timeout

      def initialize(response)
        @response = response
      end

      def request(_request)
        @response
      end
    end
  end
end
