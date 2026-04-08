require "test_helper"

class GenerateWeeklySummaryAlertsJobTest < ActiveJob::TestCase
  test "perform creates weekly summary alerts on friday for pending records in current week" do
    user = User.create!(
      name: "Usuario Job Semanal",
      email: "usuario_job_semanal_#{Time.now.to_i}_#{rand(1000)}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )

    user.financial_records.create!(
      title: "Conta da semana",
      description: "Teste",
      record_type: "launch",
      flow_type: "expense",
      amount: 120,
      status: "pending",
      due_date: Date.new(2026, 4, 2),
      recurring: false,
      recurrence_type: "none",
      recurrence_count: 1,
      installments_total: 1,
      installment_number: 1
    )

    assert_difference("NotificationAlert.where(alert_type: 'weekly_summary').count", 1) do
      GenerateWeeklySummaryAlertsJob.perform_now("2026-04-03T09:00:00Z")
    end
  end
end

