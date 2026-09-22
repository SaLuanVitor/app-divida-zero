require "test_helper"

class TelegramDispatchJobTest < ActiveJob::TestCase
  setup do
    @user = User.create!(
      name: "Telegram Dispatch Test",
      email: "telegram_dispatch_#{Time.now.to_i}_#{rand(1000)}@example.com",
      password: "senha1234",
      password_confirmation: "senha1234",
      telegram_chat_id: "123456789",
      telegram_opt_in_at: Time.current,
      telegram_notification_preferences: {
        "telegram_notifications_enabled" => true,
        "telegram_due_reminders" => true,
        "telegram_weekly_summary" => false
      }
    )
    @alert = @user.notification_alerts.create!(
      alert_type: "due_today", title: "Test", message: "Test",
      due_count: 1, window_key: "telegram-dispatch-#{SecureRandom.hex(4)}", metadata: {}
    )
  end

  test "perform does not enqueue additional jobs" do
    assert_performed_jobs 0
    TelegramDispatchJob.perform_now(@alert.id)
    assert_performed_jobs 0
  end

  test "perform skips when alert not found" do
    assert_nil TelegramDispatchJob.perform_now(-1)
  end

  test "perform skips when no valid recipient" do
    @user.update!(telegram_chat_id: nil)
    assert_nil TelegramDispatchJob.perform_now(@alert.id)
  end
end
