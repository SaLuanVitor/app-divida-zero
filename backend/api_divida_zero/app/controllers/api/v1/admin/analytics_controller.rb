module Api
  module V1
    module Admin
      class AnalyticsController < BaseController
        DIMENSION_COLUMNS = {
          usability: :usability_rating,
          helpfulness: :helpfulness_rating,
          calendar: :calendar_rating,
          alerts: :alerts_rating,
          goals: :goals_rating,
          reports: :reports_rating,
          records: :records_rating
        }.freeze

        def overview
          days = normalized_days
          period_start = days.days.ago.beginning_of_day
          period_end = Time.current

          total_users = User.count
          active_users = User.where(active: true).count
          inactive_users = total_users - active_users
          users_created_in_period = User.where("created_at >= ?", period_start).count

          ratings_scope = AppRating.all
          suggestions_scope = AppRating.where.not(suggestions: [nil, ""]).order(created_at: :desc)
          analytics_scope = AnalyticsEvent.where("created_at >= ? AND created_at <= ?", period_start, period_end)
          records_scope = FinancialRecord.where(due_date: period_start.to_date..period_end.to_date)
          goal_contributions_scope = FinancialGoalContribution.where("created_at >= ? AND created_at <= ?", period_start, period_end)

          settled_totals = records_scope.where.not(status: "pending").group(:flow_type).sum(:amount)
          settled_income_total = settled_totals.fetch("income", 0).to_d
          settled_expense_total = settled_totals.fetch("expense", 0).to_d

          render json: {
            period_days: days,
            users: {
              total: total_users,
              active: active_users,
              inactive: inactive_users,
              created_in_period: users_created_in_period,
              created_trend: users_created_trend(period_start)
            },
            engagement: {
              logins_in_period: User.where("last_login_at >= ?", period_start).count,
              active_users_7d: User.where("last_login_at >= ?", 7.days.ago.beginning_of_day).count,
              active_users_30d: User.where("last_login_at >= ?", 30.days.ago.beginning_of_day).count,
              activity_rate_pct: activity_rate(total_users, User.where("last_login_at >= ?", period_start).count)
            },
            app_usage: {
              total_events: analytics_scope.count,
              sessions: analytics_scope.where.not(session_id: [nil, ""]).distinct.count(:session_id),
              users_with_events: analytics_scope.distinct.count(:user_id),
              top_events: top_events(analytics_scope),
              top_screens: top_screens(analytics_scope),
              events_trend: events_trend(analytics_scope)
            },
            onboarding_tutorial_funnel: onboarding_tutorial_funnel(analytics_scope),
            financial_overview: {
              records_in_period: records_scope.count,
              by_flow: grouped_totals(records_scope.group(:flow_type).sum(:amount)),
              by_status: grouped_totals(records_scope.group(:status).sum(:amount)),
              settled_income_total: settled_income_total,
              settled_expense_total: settled_expense_total,
              settled_net_balance: settled_income_total - settled_expense_total,
              goals_active: FinancialGoal.where(status: "active").count,
              goals_completed: FinancialGoal.where(status: "completed").count,
              goal_deposit_volume: goal_contributions_scope.where(kind: "deposit").sum(:amount).to_d,
              goal_withdraw_volume: goal_contributions_scope.where(kind: "withdraw").sum(:amount).to_d
            },
            app_ratings: {
              total_responses: ratings_scope.count,
              averages: averages_for(ratings_scope),
              distributions: distributions_for(ratings_scope),
              recent_suggestions: paginated_suggestions(suggestions_scope)
            }
          }, status: :ok
        end

        private

        def normalized_days
          raw = params[:days].to_i
          return 30 if raw <= 0

          [raw, 180].min
        end

        def activity_rate(total_users, active_users)
          return 0.to_d if total_users <= 0

          ((active_users.to_d / total_users.to_d) * 100).round(2)
        end

        def users_created_trend(period_start)
          User.where("created_at >= ?", period_start)
              .group("DATE(created_at)")
              .order("DATE(created_at)")
              .count
              .map do |date, count|
            {
              date: date.to_s,
              count: count
            }
          end
        end

        def top_events(scope)
          scope.group(:event_name).count.sort_by { |(_event_name, count)| -count }.first(8).map do |event_name, count|
            {
              event_name: event_name.to_s,
              count: count
            }
          end
        end

        def top_screens(scope)
          scope.where.not(screen: [nil, ""]).group(:screen).count.sort_by { |(_screen, count)| -count }.first(8).map do |screen, count|
            {
              screen: screen.to_s,
              count: count
            }
          end
        end

        def events_trend(scope)
          scope.group("DATE(created_at)")
               .order("DATE(created_at)")
               .count
               .map do |date, count|
            {
              date: date.to_s,
              count: count
            }
          end
        end

        def onboarding_tutorial_funnel(scope)
          grouped = scope.group(:event_name).count
          completion_modes = scope.where(event_name: "onboarding_completed").pluck(:metadata).map do |metadata|
            metadata.is_a?(Hash) ? metadata["mode"].to_s : ""
          end

          {
            onboarding_viewed: grouped.fetch("onboarding_viewed", 0),
            onboarding_completed: grouped.fetch("onboarding_completed", 0),
            onboarding_skipped: grouped.fetch("onboarding_skipped", 0),
            tutorial_reopened: grouped.fetch("tutorial_reopened", 0),
            onboarding_mode: {
              beginner: completion_modes.count { |mode| mode == "adaptive" },
              advanced: completion_modes.count { |mode| mode == "advanced_no_tutorial" },
              unknown: completion_modes.count { |mode| mode.blank? || (mode != "adaptive" && mode != "advanced_no_tutorial") }
            }
          }
        end

        def grouped_totals(grouped_values)
          grouped_values.each_with_object({}) do |(key, value), result|
            result[key.to_s] = value.to_d
          end
        end

        def averages_for(scope)
          DIMENSION_COLUMNS.each_with_object({}) do |(key, column), result|
            result[key] = scope.average(column).to_f.round(2)
          end
        end

        def distributions_for(scope)
          DIMENSION_COLUMNS.each_with_object({}) do |(key, column), result|
            grouped = scope.group(column).count
            result[key] = (1..5).map { |rating| { rating: rating, count: grouped[rating] || 0 } }
          end
        end

        def paginated_suggestions(scope)
          page = params[:suggestions_page].to_i
          per_page = params[:suggestions_per_page].to_i
          page = 1 if page <= 0
          per_page = 20 if per_page <= 0
          per_page = [per_page, 100].min

          total = scope.count
          records = scope.offset((page - 1) * per_page).limit(per_page)

          {
            items: records.map do |rating|
              {
                id: rating.id,
                suggestion: rating.suggestions,
                created_at: rating.created_at
              }
            end,
            pagination: {
              page: page,
              per_page: per_page,
              total: total,
              total_pages: (total.to_f / per_page).ceil
            }
          }
        end
      end
    end
  end
end
