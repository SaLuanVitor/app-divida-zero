require "test_helper"

class Api::V1::FinancialGoalContributionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(
      name: "Usuario Contribuicao",
      email: "usuario_contribuicao_#{Time.now.to_i}_#{rand(1000)}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
    @tokens = JsonWebToken.issue_pair(user_id: @user.id)
    @goal = @user.financial_goals.create!(
      title: "Reserva de emergencia",
      target_amount: 5000,
      start_date: Date.current.beginning_of_month,
      goal_type: "save"
    )

    @user.financial_records.create!(
      title: "Salario base",
      record_type: "launch",
      flow_type: "income",
      amount: 1000,
      status: "received",
      paid_at: Time.current,
      due_date: Date.current,
      recurring: false,
      recurrence_type: "none",
      recurrence_count: 1,
      installments_total: 1,
      installment_number: 1,
      priority: "normal"
    )
  end

  test "create deposit generates contribution, linked record and notification" do
    assert_difference ["FinancialGoalContribution.count", "FinancialRecord.count", "NotificationAlert.count"], 1 do
      post "/api/v1/financial_goals/#{@goal.id}/contributions",
           params: { kind: "deposit", amount: 250, notes: "aporte inicial" },
           headers: auth_header(@tokens[:access_token])
    end

    assert_response :created
    body = JSON.parse(response.body)

    contribution = FinancialGoalContribution.find(body["contribution"]["id"])
    linked_record = FinancialRecord.find(body["linked_record_id"])

    assert_equal "deposit", contribution.kind
    assert_equal @goal.id, contribution.financial_goal_id

    assert_equal "launch", linked_record.record_type
    assert_equal "expense", linked_record.flow_type
    assert_equal "paid", linked_record.status
    assert_equal "Meta", linked_record.category
    assert_equal @goal.id, linked_record.financial_goal_id
    assert_equal contribution.id, linked_record.financial_goal_contribution_id

    alert = NotificationAlert.order(:id).last
    assert_equal "goal_funding", alert.alert_type
    assert_equal "goal-funding-#{contribution.id}", alert.window_key
    assert_equal linked_record.id, alert.metadata["linked_record_id"]

    get "/api/v1/financial_records",
        params: { year: Date.current.year, month: Date.current.month },
        headers: auth_header(@tokens[:access_token])

    assert_response :ok
    records = JSON.parse(response.body)["records"]
    from_goal = records.find { |item| item["id"] == linked_record.id }
    assert_equal @goal.id, from_goal["financial_goal_id"]
    assert_equal contribution.id, from_goal["financial_goal_contribution_id"]
  end

  test "create withdraw generates income received record and notification" do
    seed_contribution = @goal.financial_goal_contributions.create!(kind: "deposit", amount: 300)
    FinancialGoalsProgressService.recalculate_goal!(@goal)

    assert_difference ["FinancialGoalContribution.count", "FinancialRecord.count", "NotificationAlert.count"], 1 do
      post "/api/v1/financial_goals/#{@goal.id}/contributions",
           params: { kind: "withdraw", amount: 120, notes: "ajuste" },
           headers: auth_header(@tokens[:access_token])
    end

    assert_response :created
    body = JSON.parse(response.body)
    linked_record = FinancialRecord.find(body["linked_record_id"])

    assert_equal "income", linked_record.flow_type
    assert_equal "received", linked_record.status
    assert_equal @goal.id, linked_record.financial_goal_id

    alert = NotificationAlert.order(:id).last
    assert_equal "goal_funding", alert.alert_type

    assert_equal 2, @goal.financial_goal_contributions.count
    assert seed_contribution.persisted?
  end

  test "create returns error and does not persist when deposit exceeds available funding" do
    assert_no_difference ["FinancialGoalContribution.count", "FinancialRecord.count", "NotificationAlert.count"] do
      post "/api/v1/financial_goals/#{@goal.id}/contributions",
           params: { kind: "deposit", amount: 2000 },
           headers: auth_header(@tokens[:access_token])
    end

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal "Valor acima do saldo disponivel para metas.", body["error"]
  end

  test "destroy contribution is blocked to preserve immutable history" do
    contribution = @goal.financial_goal_contributions.create!(kind: "deposit", amount: 100)

    assert_no_difference ["FinancialGoalContribution.count", "FinancialRecord.count", "NotificationAlert.count"] do
      delete "/api/v1/financial_goals/#{@goal.id}/contributions/#{contribution.id}",
             headers: auth_header(@tokens[:access_token])
    end

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_match(/imutavel/, body["error"])
  end

  test "deleting linked goal record also removes contribution and updates goal balance" do
    post "/api/v1/financial_goals/#{@goal.id}/contributions",
         params: { kind: "deposit", amount: 250, notes: "aporte para teste de exclusao" },
         headers: auth_header(@tokens[:access_token])

    assert_response :created
    create_body = JSON.parse(response.body)
    linked_record_id = create_body["linked_record_id"]
    contribution_id = create_body.dig("contribution", "id")

    @goal.reload
    assert_equal 250.0, @goal.current_amount.to_f

    assert_difference ["FinancialRecord.count", "FinancialGoalContribution.count"], -1 do
      delete "/api/v1/financial_records/#{linked_record_id}",
             headers: auth_header(@tokens[:access_token])
    end

    assert_response :ok
    assert_nil FinancialGoalContribution.find_by(id: contribution_id)

    @goal.reload
    assert_equal 0.0, @goal.current_amount.to_f
    assert_equal 0, @goal.progress_pct
  end

  private

  def auth_header(token)
    { "Authorization" => "Bearer #{token}" }
  end
end

