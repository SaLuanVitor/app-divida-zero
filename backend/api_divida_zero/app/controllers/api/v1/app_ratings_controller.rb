module Api
  module V1
    class AppRatingsController < ApplicationController
      before_action :authenticate_access_token!

      MAX_LIMIT = 100
      DEFAULT_LIMIT = 20

      def create
        rating = @current_user.app_ratings.create!(create_params)

        render json: {
          id: rating.id,
          message: "Avaliação enviada com sucesso.",
          created_at: rating.created_at
        }, status: :created
      end

      def me
        ratings = @current_user.app_ratings
                               .recent_first
                               .limit(normalized_limit)

        render json: { ratings: ratings.map(&:serialize) }, status: :ok
      end

      def summary
        scoped = AppRating.all
        total = scoped.count

        render json: {
          total_responses: total,
          averages: {
            usability: average_for(scoped, :usability_rating),
            helpfulness: average_for(scoped, :helpfulness_rating),
            calendar: average_for(scoped, :calendar_rating),
            alerts: average_for(scoped, :alerts_rating),
            goals: average_for(scoped, :goals_rating),
            reports: average_for(scoped, :reports_rating),
            records: average_for(scoped, :records_rating)
          }
        }, status: :ok
      end

      private

      def create_params
        params.permit(
          :usability_rating,
          :helpfulness_rating,
          :calendar_rating,
          :alerts_rating,
          :goals_rating,
          :reports_rating,
          :records_rating,
          :suggestions
        )
      end

      def normalized_limit
        raw = params[:limit].presence
        return DEFAULT_LIMIT if raw.blank?

        value = raw.to_i
        return DEFAULT_LIMIT if value <= 0

        [value, MAX_LIMIT].min
      end

      def average_for(scope, column)
        return 0.0 if scope.none?

        scope.average(column).to_f.round(2)
      end

      def authenticate_access_token!
        token = request.headers["Authorization"].to_s.split(" ").last
        payload = JsonWebToken.decode(token, expected_type: "access")
        @current_user = User.find(payload["sub"])
      rescue JWT::DecodeError, ActiveRecord::RecordNotFound
        render json: { error: "Não autorizado." }, status: :unauthorized
      end
    end
  end
end
