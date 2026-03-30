require "test_helper"

class Api::V1::GamificationControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(
      name: "Usuario Gamificacao",
      email: "usuario_gamificacao_#{Time.now.to_i}_#{rand(1000)}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
    @tokens = JsonWebToken.issue_pair(user_id: @user.id)
  end

  test "summary includes daily achievements and respects device local date header" do
    @user.gamification_events.create!(
      event_type: "record_created",
      points: 50,
      metadata: { "local_date" => "2026-03-30" }
    )

    headers = auth_header(@tokens[:access_token]).merge("X-User-Local-Date" => "2026-03-30")

    get "/api/v1/gamification/summary", headers: headers

    assert_response :ok
    body = JSON.parse(response.body)
    daily = body["daily_achievements"]
    assert daily.is_a?(Array)
    assert_equal 3, daily.size

    record_task = daily.find { |item| item["key"] == "daily_record_created" }
    assert_not_nil record_task
    assert_equal "2026-03-30", record_task["date_key"]
    assert_equal true, record_task["completed"]

    first_count = @user.gamification_events.where(event_type: "daily_achievement_completed").count
    assert_equal 1, first_count

    get "/api/v1/gamification/summary", headers: headers
    assert_response :ok
    second_count = @user.gamification_events.where(event_type: "daily_achievement_completed").count
    assert_equal 1, second_count
  end

  private

  def auth_header(token)
    { "Authorization" => "Bearer #{token}" }
  end
end
