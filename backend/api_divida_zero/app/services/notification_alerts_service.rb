class NotificationAlertsService
  NEAR_DUE_DAYS = 3
  WEEKLY_ALERT_WDAY = 5

  class << self
    def generate_for_all_users!(now: Time.zone.now)
      User.find_each do |user|
        generate_for_user!(user, now: now)
      end
    end

    def generate_for_user!(user, now: Time.zone.now)
      today = now.to_date
      window_key = build_window_key(now)
      pending_scope = user.financial_records.where(status: "pending")

      overdue_count = pending_scope.where("due_date < ?", today).count
      due_today_count = pending_scope.where(due_date: today).count
      near_due_count = pending_scope.where(due_date: (today + 1)..(today + NEAR_DUE_DAYS)).count

      create_alert_once!(
        user: user,
        alert_type: "overdue",
        due_count: overdue_count,
        window_key: window_key,
        title: "Existem contas em atraso",
        message: "Existem contas em atraso, verifique os lançamentos pendentes."
      )

      create_alert_once!(
        user: user,
        alert_type: "due_today",
        due_count: due_today_count,
        window_key: window_key,
        title: "Há contas para vencimento hoje",
        message: "Há contas para vencimento hoje, revise os pagamentos."
      )

      create_alert_once!(
        user: user,
        alert_type: "near_due",
        due_count: near_due_count,
        window_key: window_key,
        title: "Existem contas perto do vencimento",
        message: "Existem contas perto do vencimento, verifique os próximos dias."
      )

      return unless weekly_alert_day?(today)

      generate_weekly_summary_alert_for_user!(user, pending_scope: pending_scope, now: now)
    end

    private

    def generate_weekly_summary_alert_for_user!(user, pending_scope:, now:)
      today = now.to_date
      week_start = today.beginning_of_week(:monday)
      week_scope = pending_scope.where(due_date: week_start..today)
      week_income_total = week_scope.where(flow_type: "income").sum(:amount).to_d
      week_expense_total = week_scope.where(flow_type: "expense").sum(:amount).to_d
      week_pending_count = week_scope.count
      projected_balance = week_income_total - week_expense_total

      create_alert_once!(
        user: user,
        alert_type: "weekly_summary",
        due_count: week_pending_count,
        window_key: build_weekly_window_key(now),
        title: "Resumo semanal da conta",
        message: "Até hoje nesta semana: #{week_pending_count} pendência(s). " \
                 "Entradas pendentes #{money(week_income_total)} e saídas pendentes #{money(week_expense_total)}. " \
                 "Saldo previsto #{money(projected_balance)}.",
        metadata: {
          week_start: week_start.iso8601,
          week_end: today.iso8601,
          pending_income_total: week_income_total.to_s("F"),
          pending_expense_total: week_expense_total.to_s("F"),
          projected_balance: projected_balance.to_s("F")
        }
      )
    end

    def weekly_alert_day?(date)
      date.wday == WEEKLY_ALERT_WDAY
    end

    def build_window_key(now)
      local = now.in_time_zone
      bucket_hour = (local.hour / 6) * 6
      "#{local.to_date.iso8601}-#{format("%02d", bucket_hour)}"
    end

    def build_weekly_window_key(now)
      local = now.in_time_zone.to_date
      "#{local.cwyear}-W#{format("%02d", local.cweek)}"
    end

    def create_alert_once!(user:, alert_type:, due_count:, window_key:, title:, message:, metadata: {})
      return if due_count <= 0

      NotificationAlert.create_or_find_by!(
        user: user,
        alert_type: alert_type,
        window_key: window_key
      ) do |alert|
        alert.title = title
        alert.message = message
        alert.due_count = due_count
        alert.metadata = {
          due_count: due_count,
          generated_at: Time.zone.now.iso8601
        }.merge(metadata)
      end
    end

    def money(value)
      ActionController::Base.helpers.number_to_currency(value.to_d, unit: "R$ ", separator: ",", delimiter: ".")
    end
  end
end

