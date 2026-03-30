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

  test "save goal uses net settled balance within selected interval" do
    goal = @user.financial_goals.create!(
      title: "Reserva trimestral",
      target_amount: 1000,
      start_date: Date.new(2026, 3, 1),
      target_date: Date.new(2026, 3, 31),
      goal_type: "save"
    )

    create_record!(title: "Salario", flow_type: "income", status: "received", amount: 500, due_date: Date.new(2026, 3, 5))
    create_record!(title: "Divida paga", record_type: "debt", flow_type: "expense", status: "paid", amount: 180, due_date: Date.new(2026, 3, 9))
    create_record!(title: "Conta paga", flow_type: "expense", status: "paid", amount: 70, due_date: Date.new(2026, 3, 12))
    create_record!(title: "Fora do periodo", flow_type: "income", status: "received", amount: 300, due_date: Date.new(2026, 4, 2))
    create_record!(title: "Pendente", flow_type: "income", status: "pending", amount: 100, due_date: Date.new(2026, 3, 20))

    FinancialGoalsProgressService.recalculate_goal!(goal)
    goal.reload

    assert_equal 250.0, goal.current_amount.to_f
    assert_equal 25, goal.progress_pct
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

  test "goal without target_date includes records after start_date" do
    goal = @user.financial_goals.create!(
      title: "Objetivo sem prazo final",
      target_amount: 1000,
      start_date: Date.new(2026, 3, 1),
      target_date: nil,
      goal_type: "specific"
    )

    create_record!(title: "Antes do inicio", flow_type: "income", status: "received", amount: 700, due_date: Date.new(2026, 2, 25))
    create_record!(title: "Marco 1", flow_type: "income", status: "received", amount: 200, due_date: Date.new(2026, 3, 6))
    create_record!(title: "Marco 2", flow_type: "income", status: "received", amount: 400, due_date: Date.new(2026, 4, 6))
    create_record!(title: "Saida", flow_type: "expense", status: "paid", amount: 50, due_date: Date.new(2026, 4, 10))

    FinancialGoalsProgressService.recalculate_goal!(goal)
    goal.reload

    assert_equal 550.0, goal.current_amount.to_f
    assert_equal 55, goal.progress_pct
    assert_equal "active", goal.status
  end

  test "save/specific goals clamp negative balance to zero" do
    goal = @user.financial_goals.create!(
      title: "Reserva negativa",
      target_amount: 500,
      start_date: Date.new(2026, 3, 1),
      target_date: Date.new(2026, 3, 31),
      goal_type: "save"
    )

    create_record!(title: "Saida maior", flow_type: "expense", status: "paid", amount: 200, due_date: Date.new(2026, 3, 5))
    create_record!(title: "Ganho menor", flow_type: "income", status: "received", amount: 80, due_date: Date.new(2026, 3, 7))

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

