require "test_helper"

class Api::V1::AiControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(
      name: "Usuario IA",
      email: "usuario_ia_#{Time.now.to_i}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
    @tokens = JsonWebToken.issue_pair(user_id: @user.id)
  end

  test "next_action returns ai payload and creates interaction" do
    with_singleton_stub(Ai::UsageGuard, :check, { allowed: true, daily_remaining: 10, monthly_remaining: 90 }) do
      with_singleton_stub(Ai::UsageGuard, :consume!, { allowed: true, daily_remaining: 9, monthly_remaining: 89 }) do
        with_singleton_stub(Ai::Client, :generate_json, mock_next_action_result) do
          assert_difference("AiInteraction.count", 1) do
            post "/api/v1/ai/next_action", headers: auth_header(@tokens[:access_token])
          end
        end
      end
    end

    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal "Fechar pendencias", body.dig("next_action", "title")
  end

  test "categorize_record validates payload" do
    post "/api/v1/ai/categorize_record", params: { amount: "35.00" }, headers: auth_header(@tokens[:access_token])

    assert_response :unprocessable_entity
  end

  test "next_action returns too_many_requests when quota is exhausted" do
    with_singleton_stub(Ai::UsageGuard, :check, { allowed: false, daily_remaining: 0, monthly_remaining: 50 }) do
      post "/api/v1/ai/next_action", headers: auth_header(@tokens[:access_token])
    end

    assert_response :too_many_requests
  end

  test "feedback stores user vote" do
    interaction = @user.ai_interactions.create!(
      feature: "next_action",
      prompt_version: "v1",
      input_payload: {},
      output_payload: {},
      status: "success"
    )

    assert_difference("AiFeedback.count", 1) do
      post "/api/v1/ai/feedback",
           params: { interaction_id: interaction.id, vote: "like", useful: true, comment: "Ajudou" },
           headers: auth_header(@tokens[:access_token])
    end

    assert_response :created
  end

  test "ai endpoints require token" do
    post "/api/v1/ai/next_action"
    assert_response :unauthorized
  end

  private

  def auth_header(token)
    { "Authorization" => "Bearer #{token}" }
  end

  def mock_next_action_result
    {
      ok: true,
      source: "llm",
      provider: "openai",
      model: "gpt-4.1-mini",
      content: {
        "title" => "Fechar pendencias",
        "description" => "Conclua uma pendencia hoje para melhorar seu saldo.",
        "cta" => "Ver pendentes",
        "confidence" => 0.82
      },
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
      latency_ms: 1200
    }
  end

  def with_singleton_stub(target, method_name, return_value)
    singleton = class << target; self; end
    backup_method = "__codex_backup_#{method_name}_#{object_id}".to_sym

    singleton.send(:alias_method, backup_method, method_name)
    singleton.send(:define_method, method_name) do |*_args|
      return_value
    end

    yield
  ensure
    singleton.send(:remove_method, method_name) rescue nil
    singleton.send(:alias_method, method_name, backup_method) rescue nil
    singleton.send(:remove_method, backup_method) rescue nil
  end
end
