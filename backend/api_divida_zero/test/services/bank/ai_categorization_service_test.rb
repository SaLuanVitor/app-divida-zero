require "test_helper"

module Bank
  class AiCategorizationServiceTest < ActiveSupport::TestCase
    setup do
      @user = User.create!(
        name: "AI Categorization Test",
        email: "ai_categorization_#{Time.now.to_i}_#{rand(1000)}@example.com",
        password: "senha1234",
        password_confirmation: "senha1234"
      )
      @transactions = [
        { description: "Supermercado Extra", amount: 350.0, flow_type: "expense" },
        { description: "Salario Empresa", amount: 5000.0, flow_type: "income" }
      ]
    end

    test "fake_categorize returns deterministic categories in test_mode" do
      result = AiCategorizationService.categorize_batch(@user, @transactions, test_mode: true)
      assert_equal 2, result.length
      assert_equal "Alimentação", result[0][:suggested_category]
      assert_equal "Transporte", result[1][:suggested_category]
      assert_equal 0.85, result[0][:ai_confidence]
    end

    test "fake_categorize preserves original fields" do
      result = AiCategorizationService.categorize_batch(@user, @transactions, test_mode: true)
      assert_equal 350.0, result[0][:amount]
      assert_equal "Supermercado Extra", result[0][:description]
    end

    test "no_ai_available falls back to fake when AI_API_KEY is missing" do
      orig = ENV["AI_API_KEY"]
      ENV["AI_API_KEY"] = nil
      ENV["OPENAI_API_KEY"] = nil

      result = AiCategorizationService.categorize_batch(@user, @transactions, test_mode: false)
      assert_equal 2, result.length

      ENV["AI_API_KEY"] = orig
    end

    test "guard sanitizes response" do
      response = { "transactions" => [
        { "index" => 0, "suggested_category" => "A" * 100, "flow_type" => "invalid", "confidence" => 5.0 }
      ] }
      guarded = AiCategorizationService.guard(response.to_json)
      assert_equal 40, guarded["transactions"][0]["suggested_category"].length
      assert_equal "expense", guarded["transactions"][0]["flow_type"]
      assert_equal 1.0, guarded["transactions"][0]["confidence"]
    end

    test "build_fallback_array creates safe defaults" do
      fallback = AiCategorizationService.build_fallback_array(@transactions)
      assert_equal 2, fallback.length
      assert_equal "Outros", fallback[0]["suggested_category"]
      assert_equal 0.4, fallback[0]["confidence"]
    end

    test "categorize_batch calls Ai::Client with mocked response and merges results" do
      ai_key = ENV["AI_API_KEY"]
      ENV["AI_API_KEY"] = "test-key"
      ENV["OPENAI_API_KEY"] = nil

      mocked_response = {
        "transactions" => [
          { "index" => 0, "suggested_category" => "Supermercado", "flow_type" => "expense", "confidence" => 0.92 },
          { "index" => 1, "suggested_category" => "Salário", "flow_type" => "income", "confidence" => 0.98 }
        ]
      }

      Ai::Client.stub(:generate_json, ->(feature:, system_prompt:, user_prompt:, fallback:, response_guard:) {
        { ok: true, source: "llm", content: mocked_response, prompt_tokens: 10, completion_tokens: 5, total_tokens: 15, latency_ms: 100 }
      }) do
        result = AiCategorizationService.categorize_batch(@user, @transactions, test_mode: false)
        assert_equal 2, result.length
        assert_equal "Supermercado", result[0][:suggested_category]
        assert_equal "Salário", result[1][:suggested_category]
        assert_equal 0.92, result[0][:ai_confidence]
        assert_equal "income", result[1][:flow_type]
      end
    ensure
      ENV["AI_API_KEY"] = ai_key
    end

test "categorize_batch falls back when Ai::Client returns error" do
      ai_key = ENV["AI_API_KEY"]
      ENV["AI_API_KEY"] = "test-key"
      ENV["OPENAI_API_KEY"] = nil

      Ai::Client.stub(:generate_json, ->(feature:, system_prompt:, user_prompt:, fallback:, response_guard:) {
        fallback_payload = fallback.call(feature)
        { ok: false, source: "fallback", content: fallback_payload, prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, latency_ms: 1, error_message: "API timeout" }
      }) do
        result = AiCategorizationService.categorize_batch(@user, @transactions, test_mode: false)
        assert_equal 2, result.length
assert_equal "Outros", result[0][:suggested_category]
        assert_equal 0.4, result[0][:ai_confidence]
      end
    ensure
      ENV["AI_API_KEY"] = ai_key
    end
  end
end
