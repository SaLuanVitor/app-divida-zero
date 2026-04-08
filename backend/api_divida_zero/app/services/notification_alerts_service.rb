class NotificationAlertsService
  NEAR_DUE_DAYS = 3

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
    end

    private

    def build_window_key(now)
      local = now.in_time_zone
      bucket_hour = (local.hour / 6) * 6
      "#{local.to_date.iso8601}-#{format('%02d', bucket_hour)}"
    end

    def create_alert_once!(user:, alert_type:, due_count:, window_key:, title:, message:)
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
        }
      end
    end
  end
end
