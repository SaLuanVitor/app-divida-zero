require "test_helper"

class NotificationAlertsServiceTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(
      name: "Usuario Alertas",
      email: "usuario_alertas_#{Time.now.to_i}_#{rand(1000)}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )

    @user.financial_records.create!(
      title: "Conta Hoje",
      description: "Teste",
      record_type: "launch",
      flow_type: "expense",
      amount: 150,
      status: "pending",
      due_date: Date.new(2026, 3, 30),
      recurring: false,
      recurrence_type: "none",
      recurrence_count: 1,
      installments_total: 1,
      installment_number: 1
    )

    @user.financial_records.create!(
      title: "Conta Proxima",
      description: "Teste",
      record_type: "launch",
      flow_type: "expense",
      amount: 200,
      status: "pending",
      due_date: Date.new(2026, 4, 1),
      recurring: false,
      recurrence_type: "none",
      recurrence_count: 1,
      installments_total: 1,
      installment_number: 1
    )
  end

  test "generate_for_user creates due alerts and avoids duplicate alerts in same 6h window" do
    now = Time.zone.parse("2026-03-30 06:10:00")

    assert_difference("NotificationAlert.count", 2) do
      NotificationAlertsService.generate_for_user!(@user, now: now)
    end

    assert_no_difference("NotificationAlert.count") do
      NotificationAlertsService.generate_for_user!(@user, now: now)
    end

    types = @user.notification_alerts.pluck(:alert_type)
    assert_includes types, "due_today"
    assert_includes types, "near_due"
  end
end

