require "test_helper"

class EmailDispatchJobTest < ActionMailer::TestCase
  setup do
    @user = User.create!(
      name: "Dispatch Test",
      email: "dispatch_test_#{Time.now.to_i}_#{rand(1000)}",
      password: "senha1234",
      password_confirmation: "senha1234",
      email_notification_preferences: {
        email_notifications_enabled: true,
        email_due_reminders: true,
        email_weekly_summary: false
      }
    )
    @alert = @user.notification_alerts.create!(
      alert_type: "due_today", title: "Test", message: "Test",
      due_count: 1, window_key: "test-dispatch-1", metadata: {}
    )
  end

  test "perform does not enqueue additional jobs" do
    assert_performed_jobs 0
    EmailDispatchJob.perform_now(@alert.id)
    assert_performed_jobs 0
  end

  test "perform skips when alert not found" do
    assert_nil EmailDispatchJob.perform_now(-1)
  end

  test "perform skips when user has no email preference" do
    weekly_alert = @user.notification_alerts.create!(
      alert_type: "weekly_summary", title: "Weekly", message: "Weekly",
      due_count: 0, window_key: "test-dispatch-2", metadata: {}
    )
    assert_no_emails do
      EmailDispatchJob.perform_now(weekly_alert.id)
    end
  end

  test "perform delivers email when valid recipient" do
    assert_emails 1 do
      EmailDispatchJob.perform_now(@alert.id)
    end
  end
end
