require "test_helper"

class FinancialGoalsProgressServiceTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(
      name: "Usuario Meta",
      email: "usuario_meta_#{Time.now.to_i}_#{rand(1000)}",
      password: "senha1234",
      password_confirmation: "senha1234"
    )
  end

  test "save goal uses contribution balance" do
    goal = @user.financial_goals.create!(
      title: "Reserva trimestral",
      target_amount: 1000,
      start_date: Date.new(2026, 3, 1),
      target_date: Date.new(2026, 3, 31),
      goal_type: "save"
    )

    goal.financial_goal_contributions.create!(kind: "deposit", amount: 500)
    goal.financial_goal_contributions.create!(kind: "withdraw", amount: 180)
    goal.financial_goal_contributions.create!(kind: "deposit", amount: 70)

    FinancialGoalsProgressService.recalculate_goal!(goal)
    goal.reload

    assert_equal 390.0, goal.current_amount.to_f
    assert_equal 39, goal.progress_pct
    assert_equal "active", goal.status
  end

  test "debt goal counts only paid debt records inside interval" do
    goal = @user.financial_goals.create!(
      title: "Quitar cartao",
      target_amount: 1000,
      start_date: Date.new(2026, 3, 1),
      target_date: Date.new(2026, 3, 31),
      goal_type: "debt"
    )

    create_record!(title: "Parcela quitada", record_type: "debt", flow_type: "expense", status: "paid", amount: 300, due_date: Date.new(2026, 3, 4))
    create_record!(title: "Divida pendente", record_type: "debt", flow_type: "expense", status: "pending", amount: 120, due_date: Date.new(2026, 3, 8))
    create_record!(title: "Divida fora do intervalo", record_type: "debt", flow_type: "expense", status: "paid", amount: 200, due_date: Date.new(2026, 4, 3))
    create_record!(title: "Despesa comum", record_type: "launch", flow_type: "expense", status: "paid", amount: 90, due_date: Date.new(2026, 3, 10))
    create_record!(title: "Ganho recebido", flow_type: "income", status: "received", amount: 400, due_date: Date.new(2026, 3, 15))

    FinancialGoalsProgressService.recalculate_goal!(goal)
    goal.reload

    assert_equal 300.0, goal.current_amount.to_f
    assert_equal 30, goal.progress_pct
    assert_equal "active", goal.status
  end

  test "specific goal uses contribution balance even without target_date" do
    goal = @user.financial_goals.create!(
      title: "Objetivo sem prazo final",
      target_amount: 1000,
      start_date: Date.new(2026, 3, 1),
      target_date: nil,
      goal_type: "specific"
    )

    goal.financial_goal_contributions.create!(kind: "deposit", amount: 200)
    goal.financial_goal_contributions.create!(kind: "deposit", amount: 400)
    goal.financial_goal_contributions.create!(kind: "withdraw", amount: 50)

    FinancialGoalsProgressService.recalculate_goal!(goal)
    goal.reload

    assert_equal 550.0, goal.current_amount.to_f
    assert_equal 55, goal.progress_pct
    assert_equal "active", goal.status
  end

  test "save/specific goals clamp negative contribution balance to zero" do
    goal = @user.financial_goals.create!(
      title: "Reserva negativa",
      target_amount: 500,
      start_date: Date.new(2026, 3, 1),
      target_date: Date.new(2026, 3, 31),
      goal_type: "save"
    )

    goal.financial_goal_contributions.create!(kind: "withdraw", amount: 200)
    goal.financial_goal_contributions.create!(kind: "deposit", amount: 80)

    FinancialGoalsProgressService.recalculate_goal!(goal)
    goal.reload

    assert_equal 0.0, goal.current_amount.to_f
    assert_equal 0, goal.progress_pct
    assert_equal "active", goal.status
  end

  private

  def create_record!(attrs = {})
    defaults = {
      title: "Registro",
      record_type: "launch",
      flow_type: "income",
      status: "received",
      due_date: Date.current,
      amount: 100
    }

    @user.financial_records.create!(defaults.merge(attrs))
  end
end
