require "test_helper"

class Api::V1::NotificationsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(
      name: "Usuario Notificacoes",
      email: "usuario_notificacoes_#{Time.now.to_i}_#{rand(1000)}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
    @tokens = JsonWebToken.issue_pair(user_id: @user.id)

    @user.notification_alerts.create!(
      alert_type: "due_today",
      title: "Ha contas para vencimento hoje",
      message: "Ha contas para vencimento hoje, revise os pagamentos.",
      due_count: 2,
      window_key: "2026-03-30-06",
      metadata: {}
    )
  end

  test "history returns user notifications ordered by newest first" do
    get "/api/v1/notifications/history", headers: auth_header(@tokens[:access_token])

    assert_response :ok
    body = JSON.parse(response.body)
    notifications = body["notifications"]
    assert notifications.is_a?(Array)
    assert_equal 1, notifications.size
    assert_equal "due_today", notifications.first["alert_type"]
  end

  test "read_all marks all unread notifications as read" do
    patch "/api/v1/notifications/read_all", headers: auth_header(@tokens[:access_token])

    assert_response :ok
    body = JSON.parse(response.body)
    assert_equal 1, body["updated_count"]
    assert_equal 0, @user.notification_alerts.unread.count
  end

  private

  def auth_header(token)
    { "Authorization" => "Bearer #{token}" }
  end
end

