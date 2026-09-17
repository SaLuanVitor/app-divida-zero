require "test_helper"

class PushDispatchJobTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper

  setup do
    @user = User.create!(
      name: "Usuario Dispatch",
      email: "usuario_dispatch_#{Time.now.to_i}_#{rand(1000)}",
      password: "senha1234",
      password_confirmation: "senha1234",
      push_preferences: {
        notifications_enabled: true,
        device_push_enabled: true,
        notify_due_today: true
      }
    )

    @alert = @user.notification_alerts.create!(
      alert_type: "due_today",
      title: "Ha contas para vencimento hoje",
      message: "Ha contas para vencimento hoje, revise os pagamentos.",
      due_count: 2,
      window_key: "2026-07-10-06",
      metadata: {}
    )

    @user.device_tokens.create!(
      expo_push_token: "ExponentPushToken[dispatch]",
      platform: "android",
      last_seen_at: Time.current
    )
  end

  test "perform dispatches push when preferences and tokens are available" do
    delivered = nil

    ExpoPushService.stub(:deliver, ->(**args) {
      delivered = args
      { delivered: 1, removed_tokens: [] }
    }) do
      PushDispatchJob.perform_now(@alert.id)
    end

    assert_equal "Ha contas para vencimento hoje", delivered[:title]
    assert_equal [@alert.id], [delivered[:data][:notification_alert_id]]
    assert_equal ["ExponentPushToken[dispatch]"], delivered[:tokens]
  end

  test "perform skips dispatch when push preferences are disabled" do
    @user.update!(push_preferences: { notifications_enabled: false })

    called = false
    ExpoPushService.stub(:deliver, ->(**_args) { called = true }) do
      PushDispatchJob.perform_now(@alert.id)
    end

    refute called
  end
end
