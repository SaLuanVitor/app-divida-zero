require "test_helper"

class Api::V1::Admin::AnalyticsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = User.create!(
      name: "Admin Analytics",
      email: "admin_analytics_test",
      password: "senha1234",
      password_confirmation: "senha1234",
      role: "admin"
    )
    @user = User.create!(
      name: "Usuario Analytics",
      email: "usuario_analytics_test",
      password: "senha1234",
      password_confirmation: "senha1234"
    )

    @admin_token = JsonWebToken.issue_pair(user_id: @admin.id)[:access_token]
    @user_token = JsonWebToken.issue_pair(user_id: @user.id)[:access_token]

    @user.app_ratings.create!(
      usability_rating: 5,
      helpfulness_rating: 4,
      calendar_rating: 5,
      alerts_rating: 3,
      goals_rating: 4,
      reports_rating: 5,
      records_rating: 4,
      suggestions: "Muito bom para o TCC"
    )
  end

  test "overview returns admin analytics payload" do
    get "/api/v1/admin/analytics/overview", headers: auth_header(@admin_token)

    assert_response :ok
    body = JSON.parse(response.body)
    assert body["users"].is_a?(Hash)
    assert body["app_ratings"].is_a?(Hash)
    assert body.dig("app_ratings", "total_responses") >= 1
    assert body.dig("app_ratings", "distributions", "usability").is_a?(Array)
  end

  test "overview blocks non admin users" do
    get "/api/v1/admin/analytics/overview", headers: auth_header(@user_token)

    assert_response :forbidden
  end

  private

  def auth_header(token)
    { "Authorization" => "Bearer #{token}" }
  end
end
