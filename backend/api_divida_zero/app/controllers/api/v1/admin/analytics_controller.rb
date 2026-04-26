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

          total_users = User.count
          active_users = User.where(active: true).count
          inactive_users = total_users - active_users
          users_created_in_period = User.where("created_at >= ?", period_start).count

          ratings_scope = AppRating.all
          suggestions_scope = AppRating.where.not(suggestions: [nil, ""]).order(created_at: :desc)

          render json: {
            period_days: days,
            users: {
              total: total_users,
              active: active_users,
              inactive: inactive_users,
              created_in_period: users_created_in_period,
              created_trend: users_created_trend(period_start)
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
