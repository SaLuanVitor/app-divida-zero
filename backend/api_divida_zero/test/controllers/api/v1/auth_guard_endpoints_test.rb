require "test_helper"

class Api::V1::AuthGuardEndpointsTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(
      name: "Usuario Guard",
      email: "usuario_guard",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
    @tokens = JsonWebToken.issue_pair(user_id: @user.id)
  end

  test "financial_goals index requires access token" do
    get "/api/v1/financial_goals"
    assert_response :unauthorized

    get "/api/v1/financial_goals", headers: auth_header(@tokens[:access_token])
    assert_response :ok
  end

  test "financial_records index requires access token" do
    get "/api/v1/financial_records"
    assert_response :unauthorized

    get "/api/v1/financial_records", headers: auth_header(@tokens[:access_token])
    assert_response :ok
  end

  test "gamification endpoints require access token" do
    get "/api/v1/gamification/summary"
    assert_response :unauthorized

    get "/api/v1/gamification/events"
    assert_response :unauthorized

    get "/api/v1/gamification/summary", headers: auth_header(@tokens[:access_token])
    assert_response :ok

    get "/api/v1/gamification/events", headers: auth_header(@tokens[:access_token])
    assert_response :ok
  end

  private

  def auth_header(token)
    { "Authorization" => "Bearer #{token}" }
  end
end

