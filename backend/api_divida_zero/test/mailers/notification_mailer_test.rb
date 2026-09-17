require "test_helper"

class NotificationMailerTest < ActionMailer::TestCase
  setup do
    @user = User.create!(
      name: "Mailer Test",
      email: "mailer_test_#{Time.now.to_i}@example.com",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
    @alert = @user.notification_alerts.create!(
      alert_type: "due_today", title: "Contas a vencer",
      message: "Voce tem contas para pagar hoje",
      due_count: 3, window_key: "test-mail-1", metadata: {}
    )
  end

  test "due_reminder renders headers" do
    email = NotificationMailer.due_reminder(@user, @alert)
    assert_equal [ "onboarding@resend.dev" ], email.from
    assert_equal [ @user.email ], email.to
    assert_equal "Contas a vencer — App Dívida Zero", email.subject
  end

  test "due_reminder renders body" do
    email = NotificationMailer.due_reminder(@user, @alert)
    assert_match @user.name, email.html_part.body.to_s
    assert_match "3", email.html_part.body.to_s
  end

  test "due_reminder delivers" do
    assert_emails 1 do
      NotificationMailer.due_reminder(@user, @alert).deliver_now
    end
  end

  test "weekly_summary renders headers" do
    weekly_alert = @user.notification_alerts.create!(
      alert_type: "weekly_summary", title: "Resumo",
      message: "Seu resumo semanal",
      due_count: 0, window_key: "test-mail-2",
      metadata: { week_start: "2026-07-06", week_end: "2026-07-12",
                  pending_income_total: 5000, pending_expense_total: 3000,
                  projected_balance: 2000 }
    )
    email = NotificationMailer.weekly_summary(@user, weekly_alert)
    assert_equal [ "onboarding@resend.dev" ], email.from
    assert_equal [ @user.email ], email.to
    assert_equal "Resumo semanal — App Dívida Zero", email.subject
  end

  test "weekly_summary delivers" do
    weekly_alert = @user.notification_alerts.create!(
      alert_type: "weekly_summary", title: "Resumo",
      message: "Seu resumo semanal",
      due_count: 0, window_key: "test-mail-3",
      metadata: { week_start: "2026-07-06", week_end: "2026-07-12" }
    )
    assert_emails 1 do
      NotificationMailer.weekly_summary(@user, weekly_alert).deliver_now
    end
  end
end
