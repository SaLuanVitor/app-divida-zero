class WeeklyEvolutionBuilder
  class << self
    def build_for_user(user, now: Time.zone.now)
      today = now.to_date
      week_start = today.beginning_of_week(:monday)

      {
        week_start: week_start.iso8601,
        week_end: today.iso8601,
        goals_advanced: goals_advanced_for_user(user, week_start, today),
        economy: economy_for_user(user, week_start, today),
        streak: current_streak(user),
        total_records: user.financial_records.where(created_at: week_start..today.end_of_day).count,
        goal_milestones: goal_milestones_for_user(user, week_start, today)
      }
    end

    def evolution_title(data)
      return "Semana de evolução!" if data[:goals_advanced].any?
      return "Você movimentou seu dinheiro esta semana" if data[:total_records] > 0

      "Que tal registrar seus gastos esta semana?"
    end

    def evolution_message(data, user)
      parts = []
      name = user.name.split(" ").first

      if data[:goals_advanced].any?
        goal_lines = data[:goals_advanced].map { |g| "#{g[:title]} (#{g[:progress]}%)" }.join(", ")
        parts << "Suas metas avançaram: #{goal_lines}."
      end

      if data[:economy] && data[:economy][:settled_balance].to_d > 0
        balance = format_money(data[:economy][:settled_balance])
        parts << "Saldo positivo de #{balance} na semana."
      end

      if data[:streak] && data[:streak] >= 3
        parts << "#{data[:streak]} dias seguintes de atividade — que ritmo!"
      elsif data[:streak] && data[:streak] >= 2
        parts << "#{data[:streak]} dias seguidos. Continue assim!"
      end

      if data[:goal_milestones].any?
        ms = data[:goal_milestones].first
        parts << "Meta '#{ms[:title]}' atingiu #{ms[:milestone]}% — parabéns!"
      end

      if data[:total_records] > 0 && parts.empty?
        parts << "#{data[:total_records]} registro(s) financeiro(s) nesta semana."
      end

      if parts.empty?
        "Nenhum movimento esta semana. Registre suas finanças para acompanhar sua evolução."
      else
        "#{name}, #{parts.join(" ")}"
      end
    end

    private

    def goals_advanced_for_user(user, week_start, today)
      user.financial_goals
          .joins(:financial_goal_contributions)
          .where(financial_goal_contributions: { created_at: week_start..today.end_of_day })
          .distinct
          .map { |goal| { id: goal.id, title: goal.title, progress: goal.progress_pct } }
    end

    def economy_for_user(user, week_start, today)
      settled = user.financial_records
                    .where(status: %w[paid received])
                    .where(due_date: week_start..today)

      income = settled.where(flow_type: "income").sum(:amount).to_d
      expense = settled.where(flow_type: "expense").sum(:amount).to_d

      {
        settled_income: income.to_s("F"),
        settled_expense: expense.to_s("F"),
        settled_balance: (income - expense).to_s("F")
      }
    end

    def current_streak(user)
      dates = user.financial_records
                  .where("created_at >= ?", 90.days.ago)
                  .order(created_at: :desc)
                  .pluck(:created_at)
                  .map { |t| t.to_date }
                  .uniq

      return 0 if dates.empty?

      streak = 1
      today = Date.current

      dates.each_cons(2) do |current, previous|
        if current - previous == 1
          streak += 1
        else
          break
        end
      end

      # Check if most recent date is today or yesterday
      if dates.first == today || dates.first == today - 1
        streak
      else
        1
      end
    end

    def goal_milestones_for_user(user, week_start, today)
      goal_ids = user.financial_goals.pluck(:id)
      milestone_events = user.gamification_events
                             .where(event_type: "goal_progress_milestone")
                             .where(source_type: "FinancialGoal", source_id: goal_ids)
                             .where(created_at: week_start..today.end_of_day)

      milestone_events.map { |event|
        goal = user.financial_goals.find_by(id: event.source_id)
        next unless goal

        max_ms = event.metadata["milestone"].to_i
        { id: goal.id, title: goal.title, milestone: max_ms }
      }.compact
    end

    def format_money(value)
      ActionController::Base.helpers.number_to_currency(value.to_d, unit: "R$ ", separator: ",", delimiter: ".")
    end
  end
end
