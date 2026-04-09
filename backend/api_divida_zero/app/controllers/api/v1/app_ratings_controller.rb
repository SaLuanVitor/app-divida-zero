module Api
  module V1
    class AppRatingsController < ApplicationController
      before_action :authenticate_access_token!

      def create
        rating = @current_user.app_ratings.find_or_initialize_by(user_id: @current_user.id)
        is_new = rating.new_record?
        rating.assign_attributes(create_params)
        rating.save!

        render json: {
          id: rating.id,
          message: is_new ? "Avaliação enviada com sucesso." : "Avaliação atualizada com sucesso.",
          created_at: rating.created_at
        }, status: is_new ? :created : :ok
      end

      def me
        rating = @current_user.app_ratings.first
        render json: { rating: rating&.serialize }, status: :ok
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
