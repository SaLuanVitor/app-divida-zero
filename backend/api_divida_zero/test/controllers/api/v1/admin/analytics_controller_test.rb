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

    @user.update!(last_login_at: Time.current)

    AnalyticsEvent.create!(
      user: @user,
      event_name: "onboarding_viewed",
      session_id: "session_admin_test",
      screen: "Onboarding",
      metadata: {}
    )
    AnalyticsEvent.create!(
      user: @user,
      event_name: "onboarding_completed",
      session_id: "session_admin_test",
      screen: "Onboarding",
      metadata: { "mode" => "adaptive" }
    )
    AnalyticsEvent.create!(
      user: @user,
      event_name: "tutorial_reopened",
      session_id: "session_admin_test",
      screen: "Tutorial",
      metadata: {}
    )

    @user.financial_records.create!(
      title: "Receita teste admin",
      record_type: "launch",
      flow_type: "income",
      amount: 500,
      status: "received",
      due_date: Date.current
    )
    @user.financial_records.create!(
      title: "Despesa teste admin",
      record_type: "launch",
      flow_type: "expense",
      amount: 120,
      status: "paid",
      due_date: Date.current
    )
  end

  test "overview returns admin analytics payload" do
    get "/api/v1/admin/analytics/overview", headers: auth_header(@admin_token)

    assert_response :ok
    body = JSON.parse(response.body)
    assert body["users"].is_a?(Hash)
    assert body["app_ratings"].is_a?(Hash)
    assert body["engagement"].is_a?(Hash)
    assert body["app_usage"].is_a?(Hash)
    assert body["onboarding_tutorial_funnel"].is_a?(Hash)
    assert body["financial_overview"].is_a?(Hash)
    assert body.dig("app_ratings", "total_responses") >= 1
    assert body.dig("app_ratings", "distributions", "usability").is_a?(Array)
    assert body.dig("engagement", "logins_in_period") >= 1
    assert body.dig("app_usage", "total_events") >= 3
    assert body.dig("onboarding_tutorial_funnel", "onboarding_viewed") >= 1
    assert body.dig("financial_overview", "records_in_period") >= 2
  end

  test "overview blocks non admin users" do
    get "/api/v1/admin/analytics/overview", headers: auth_header(@user_token)

    assert_response :forbidden
  end

  test "overview handles empty datasets returning zeroed sections" do
    AnalyticsEvent.delete_all
    AppRating.delete_all
    FinancialRecord.delete_all
    FinancialGoalContribution.delete_all
    FinancialGoal.delete_all
    User.where.not(id: @admin.id).delete_all

    get "/api/v1/admin/analytics/overview", headers: auth_header(@admin_token)

    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal 1, body.dig("users", "total")
    assert_equal 0, body.dig("app_usage", "total_events")
    assert_equal 0, body.dig("app_ratings", "total_responses")
    assert_equal 0, body.dig("financial_overview", "records_in_period")
    assert_equal 0, body.dig("onboarding_tutorial_funnel", "onboarding_viewed")
  end

  private

  def auth_header(token)
    { "Authorization" => "Bearer #{token}" }
  end
end
