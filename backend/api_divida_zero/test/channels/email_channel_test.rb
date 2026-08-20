require "test_helper"

class EmailChannelTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(
      name: "Channel Test",
      email: "channel_test_#{Time.now.to_i}@example.com",
      password: "senha1234",
      password_confirmation: "senha1234",
      email_notification_preferences: {
        email_notifications_enabled: true,
        email_due_reminders: true,
        email_weekly_summary: false
      }
    )
  end

  test "valid_recipient? checks alert_type preference" do
    assert EmailChannel.valid_recipient?(@user, "due_today")
    refute EmailChannel.valid_recipient?(@user, "weekly_summary")
  end

  test "valid_recipient? defaults to due_today" do
    assert EmailChannel.valid_recipient?(@user)
  end

  test "valid_recipient? returns false when email disabled" do
    @user.update!(email_notification_preferences: { email_notifications_enabled: false })
    refute EmailChannel.valid_recipient?(@user, "due_today")
  end

  test "deliver sends due_reminder email" do
    alert = @user.notification_alerts.create!(
      alert_type: "due_today", title: "Test", message: "Test",
      due_count: 1, window_key: "test-1", metadata: {}
    )
    result = EmailChannel.deliver(user: @user, alert: alert)
    assert result.success?
  end

  test "deliver sends weekly_summary email" do
    alert = @user.notification_alerts.create!(
      alert_type: "weekly_summary", title: "Resumo", message: "Resumo",
      due_count: 0, window_key: "test-2",
      metadata: { week_start: "2026-07-06", week_end: "2026-07-12" }
    )
    result = EmailChannel.deliver(user: @user, alert: alert)
    assert result.success?
  end

  test "deliver returns error result on failure" do
    result = EmailChannel.deliver(user: nil, alert: nil)
    refute result.success?
    assert result.error.present?
  end

  test "channel_name is email" do
    assert_equal "email", EmailChannel.channel_name
  end
end
