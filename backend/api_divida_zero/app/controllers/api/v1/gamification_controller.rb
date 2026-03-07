module Api
  module V1
    class GamificationController < ApplicationController
      before_action :authenticate_access_token!

      def summary
        render json: { summary: GamificationService.summary_for(@current_user) }, status: :ok
      end

      def events
        render json: { events: GamificationService.events_for(@current_user, limit: 80) }, status: :ok
      end

      private

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
