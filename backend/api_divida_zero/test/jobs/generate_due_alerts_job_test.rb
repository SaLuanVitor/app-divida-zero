require "test_helper"

class GenerateDueAlertsJobTest < ActiveJob::TestCase
  test "perform generates notification alerts for pending due records" do
    user = User.create!(
      name: "Usuario Job Alerta",
      email: "usuario_job_alerta_#{Time.now.to_i}_#{rand(1000)}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )

    user.financial_records.create!(
      title: "Conta do dia",
      description: "Teste",
      record_type: "launch",
      flow_type: "expense",
      amount: 90,
      status: "pending",
      due_date: Date.new(2026, 3, 30),
      recurring: false,
      recurrence_type: "none",
      recurrence_count: 1,
      installments_total: 1,
      installment_number: 1
    )

    assert_difference("NotificationAlert.count", 1) do
      GenerateDueAlertsJob.perform_now("2026-03-30T06:00:00Z")
    end
  end
end

