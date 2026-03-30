require "test_helper"

class Api::V1::AnalyticsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @password = "senha1234"
    @user = User.create!(
      name: "Usuario Analytics",
      email: "usuario_analytics",
      password: @password,
      password_confirmation: @password
    )
    @tokens = JsonWebToken.issue_pair(user_id: @user.id)
  end

  test "create stores whitelisted analytics event with sanitized metadata" do
    assert_difference("AnalyticsEvent.count", 1) do
      post "/api/v1/analytics/events", params: {
        event_name: "record_created",
        session_id: "session_abc",
        screen: "Lancamentos",
        metadata: {
          mode: "debt",
          recurring: true,
          email: "nao_deve_ir@example.com"
        }
      }, headers: auth_header(@tokens[:access_token])
    end

    assert_response :created
    event = AnalyticsEvent.order(:id).last
    assert_equal "record_created", event.event_name
    assert_equal "debt", event.metadata["mode"]
    assert_equal true, event.metadata["recurring"]
    assert_nil event.metadata["email"]
  end

  test "create rejects unknown event name" do
    post "/api/v1/analytics/events", params: {
      event_name: "evento_nao_permitido",
      session_id: "session_xyz",
      metadata: {}
    }, headers: auth_header(@tokens[:access_token])

    assert_response :unprocessable_entity
  end

  test "create returns unauthorized without token" do
    post "/api/v1/analytics/events", params: {
      event_name: "record_created",
      session_id: "session_no_token"
    }

    assert_response :unauthorized
  end

  private

  def auth_header(token)
    { "Authorization" => "Bearer #{token}" }
  end
end
