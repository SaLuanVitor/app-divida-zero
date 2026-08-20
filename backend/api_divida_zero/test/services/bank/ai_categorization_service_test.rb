require "test_helper"

module Bank
  class AiCategorizationServiceTest < ActiveSupport::TestCase
    setup do
      @transactions = [
        { description: "Supermercado Extra", amount: 350.0, flow_type: "expense" },
        { description: "Salario Empresa", amount: 5000.0, flow_type: "income" }
      ]
    end

    test "fake_categorize returns deterministic categories in test_mode" do
      result = AiCategorizationService.categorize_batch(nil, @transactions, test_mode: true)
      assert_equal 2, result.length
      assert_equal "Alimentação", result[0][:suggested_category]
      assert_equal "Transporte", result[1][:suggested_category]
      assert_equal 0.85, result[0][:ai_confidence]
    end

    test "fake_categorize preserves original fields" do
      result = AiCategorizationService.categorize_batch(nil, @transactions, test_mode: true)
      assert_equal 350.0, result[0][:amount]
      assert_equal "Supermercado Extra", result[0][:description]
    end

    test "no_ai_available falls back to fake when AI_API_KEY is missing" do
      orig = ENV["AI_API_KEY"]
      ENV["AI_API_KEY"] = nil
      ENV["OPENAI_API_KEY"] = nil

      result = AiCategorizationService.categorize_batch(nil, @transactions, test_mode: false)
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
  end
end
