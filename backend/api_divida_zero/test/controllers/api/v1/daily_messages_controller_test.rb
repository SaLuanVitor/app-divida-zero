require "test_helper"

class Api::V1::DailyMessagesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(
      name: "Usuario Daily",
      email: "usuario_daily_#{Time.now.to_i}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
    @tokens = JsonWebToken.issue_pair(user_id: @user.id)
  end

  test "today returns the daily message for authenticated user" do
    DailyAiMessage.create!(
      date: Date.current,
      title: "Mensagem do dia",
      body: "Pequenos passos mantem o controle.",
      theme: "constancia",
      source_version: "v1"
    )

    get "/api/v1/daily_message/today", headers: auth_header(@tokens[:access_token])

    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal "Mensagem do dia", body["title"]
  end

  test "today requires authentication" do
    get "/api/v1/daily_message/today"
    assert_response :unauthorized
  end

  test "dispatch requires internal token" do
    post "/api/v1/daily_message/dispatch"
    assert_response :forbidden
  end

  test "dispatch creates daily_ai_message alerts" do
    DailyAiMessage.create!(
      date: Date.current,
      title: "Mensagem enviada",
      body: "Organize seu dia financeiro.",
      theme: "organizacao",
      source_version: "v1"
    )

    ENV.stub(:[], "dispatch-secret") do
      assert_difference("NotificationAlert.count", 1) do
        post "/api/v1/daily_message/dispatch", headers: { "X-Internal-Dispatch-Token" => "dispatch-secret" }
      end
    end

    assert_response :ok
    assert_equal "daily_ai_message", NotificationAlert.order(:created_at).last.alert_type
  end

  private

  def auth_header(token)
    { "Authorization" => "Bearer #{token}" }
  end
end
