class NotificationMailer < ApplicationMailer
  def due_reminder(user, alert)
    @user = user
    @alert = alert
    @due_count = alert.due_count
    @pending_records = user.financial_records.where(status: "pending")
      .order(due_date: :asc)
      .limit(10)

    mail(to: user.email, subject: "Contas a vencer — App Dívida Zero")
  end

  def weekly_summary(user, alert)
    @user = user
    @alert = alert
    metadata = alert.metadata
    @week_start = Date.parse(metadata["week_start"]) if metadata["week_start"]
    @week_end = Date.parse(metadata["week_end"]) if metadata["week_end"]
    @pending_income_total = metadata["pending_income_total"]
    @pending_expense_total = metadata["pending_expense_total"]
    @projected_balance = metadata["projected_balance"]

    mail(to: user.email, subject: "Resumo semanal — App Dívida Zero")
  end

  def weekly_evolution(user, alert)
    @user = user
    @alert = alert
    metadata = alert.metadata
    @week_start = Date.parse(metadata["week_start"]) if metadata["week_start"]
    @week_end = Date.parse(metadata["week_end"]) if metadata["week_end"]
    @goals_advanced = metadata["goals_advanced"] || []
    @economy = metadata["economy"] || {}
    @streak = metadata["streak"] || 0
    @total_records = metadata["total_records"] || 0
    @goal_milestones = metadata["goal_milestones"] || []

    mail(to: user.email, subject: "Sua evolução semanal — App Dívida Zero")
  end
end
