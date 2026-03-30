require "test_helper"

class Api::V1::ReportsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @password = "senha1234"
    @user = User.create!(
      name: "Usuario Relatorio",
      email: "usuario_relatorio",
      password: @password,
      password_confirmation: @password
    )
    @tokens = JsonWebToken.issue_pair(user_id: @user.id)

    @user.financial_records.create!(
      title: "Salario",
      record_type: "launch",
      flow_type: "income",
      amount: 5000,
      status: "received",
      due_date: Date.new(2026, 3, 10),
      recurring: false,
      recurrence_type: "none",
      recurrence_count: 1,
      installments_total: 1,
      installment_number: 1,
      priority: "normal"
    )

    @user.financial_records.create!(
      title: "Conta de luz",
      record_type: "debt",
      flow_type: "expense",
      amount: 300,
      status: "paid",
      due_date: Date.new(2026, 3, 12),
      recurring: false,
      recurrence_type: "none",
      recurrence_count: 1,
      installments_total: 1,
      installment_number: 1,
      category: "Casa",
      priority: "normal"
    )
  end

  test "summary returns aggregated report for period" do
    get "/api/v1/reports/summary", params: { year: 2026, month: 3 }, headers: auth_header(@tokens[:access_token])

    assert_response :ok
    body = JSON.parse(response.body)

    assert_equal 2026, body.dig("period", "year")
    assert_equal 3, body.dig("period", "month")
    assert_equal "5000.0", body.dig("summary", "income_total")
    assert_equal "300.0", body.dig("summary", "expense_total")
    assert body["top_categories"].is_a?(Array)
  end

  test "summary returns unauthorized without token" do
    get "/api/v1/reports/summary"
    assert_response :unauthorized
  end

  private

  def auth_header(token)
    { "Authorization" => "Bearer #{token}" }
  end
end
