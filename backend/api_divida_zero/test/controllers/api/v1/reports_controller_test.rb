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

    @user.financial_records.create!(
      title: "Freela pendente",
      record_type: "launch",
      flow_type: "income",
      amount: 1000,
      status: "pending",
      due_date: Date.new(2026, 3, 20),
      recurring: false,
      recurrence_type: "none",
      recurrence_count: 1,
      installments_total: 1,
      installment_number: 1,
      category: "Extra",
      priority: "normal"
    )

    @user.financial_records.create!(
      title: "Mercado pendente",
      record_type: "debt",
      flow_type: "expense",
      amount: 500,
      status: "pending",
      due_date: Date.new(2026, 3, 21),
      recurring: false,
      recurrence_type: "none",
      recurrence_count: 1,
      installments_total: 1,
      installment_number: 1,
      category: "Mercado",
      priority: "normal"
    )

    @user.financial_records.create!(
      title: "Salario fevereiro",
      record_type: "launch",
      flow_type: "income",
      amount: 4500,
      status: "received",
      due_date: Date.new(2026, 2, 10),
      recurring: false,
      recurrence_type: "none",
      recurrence_count: 1,
      installments_total: 1,
      installment_number: 1,
      priority: "normal"
    )
  end

  test "summary returns aggregated report with legacy and new payload" do
    get "/api/v1/reports/summary", params: { year: 2026, month: 3 }, headers: auth_header(@tokens[:access_token])

    assert_response :ok
    body = JSON.parse(response.body)

    assert_equal 2026, body.dig("period", "year")
    assert_equal 3, body.dig("period", "month")
    assert_equal "6000.0", body.dig("summary", "income_total")
    assert_equal "800.0", body.dig("summary", "expense_total")
    assert_equal "5200.0", body.dig("summary", "balance")
    assert body["top_categories"].is_a?(Array)

    assert body["global_indicators"].is_a?(Hash)
    assert_equal "9200.0", body.dig("global_indicators", "settled_balance_total")
    assert_equal "1000.0", body.dig("global_indicators", "pending_income_total")
    assert_equal "500.0", body.dig("global_indicators", "pending_expense_total")
    assert_equal "9700.0", body.dig("global_indicators", "projected_balance_total")

    assert_equal "6000.0", body.dig("monthly_summary", "income_total")
    assert_equal "800.0", body.dig("monthly_summary", "expense_total")
    assert_equal "5200.0", body.dig("monthly_summary", "balance")
    assert_equal 4, body.dig("monthly_summary", "records_count")

    assert_equal 6, body["monthly_trend"].length
    assert body["categories_breakdown"].is_a?(Array)
    assert_equal 4, body["detailed_records"].length
    assert body["available_categories"].include?("Casa")
  end

  test "summary applies pending status and expense flow filters" do
    get "/api/v1/reports/summary",
      params: {
        year: 2026,
        month: 3,
        status: "pending",
        flow_type: "expense"
      },
      headers: auth_header(@tokens[:access_token])

    assert_response :ok
    body = JSON.parse(response.body)

    assert_equal "pending", body.dig("filters", "status")
    assert_equal "expense", body.dig("filters", "flow_type")
    assert_nil body.dig("filters", "category")

    assert_equal "0.0", body.dig("monthly_summary", "income_total")
    assert_equal "500.0", body.dig("monthly_summary", "expense_total")
    assert_equal "-500.0", body.dig("monthly_summary", "balance")
    assert_equal 1, body.dig("monthly_summary", "records_count")

    assert_equal 1, body["detailed_records"].length
    assert_equal "Mercado", body["detailed_records"].first["category"]
    assert_equal "Mercado", body["categories_breakdown"].first["category"]
  end

  test "summary accepts sem categoria filter" do
    @user.financial_records.create!(
      title: "Outro sem categoria",
      record_type: "debt",
      flow_type: "expense",
      amount: 90,
      status: "pending",
      due_date: Date.new(2026, 3, 25),
      recurring: false,
      recurrence_type: "none",
      recurrence_count: 1,
      installments_total: 1,
      installment_number: 1,
      category: nil,
      priority: "normal"
    )

    get "/api/v1/reports/summary",
      params: {
        year: 2026,
        month: 3,
        category: "Sem categoria"
      },
      headers: auth_header(@tokens[:access_token])

    assert_response :ok
    body = JSON.parse(response.body)

    assert_equal "Sem categoria", body.dig("filters", "category")
    assert_equal 2, body.dig("monthly_summary", "records_count")
    assert body["categories_breakdown"].all? { |item| item["category"] == "Sem categoria" }
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
