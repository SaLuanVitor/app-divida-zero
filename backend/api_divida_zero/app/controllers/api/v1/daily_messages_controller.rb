module Api
  module V1
    class DailyMessagesController < ApplicationController
      before_action :authenticate_access_token!, only: [:today, :dispatch]
      before_action :authenticate_internal_dispatch!, only: [:dispatch]

      def today
        message = DailyAiMessage.find_by(date: Date.current) || Ai::DailyMessageGenerator.generate_for(date: Date.current)

        render json: serialize_message(message), status: :ok
      end

      def dispatch
        message = DailyAiMessage.find_by(date: Date.current) || Ai::DailyMessageGenerator.generate_for(date: Date.current)
        dispatched = 0

        User.find_each do |user|
          alert = NotificationAlert.create_or_find_by!(
            user: user,
            alert_type: "daily_ai_message",
            window_key: Date.current.iso8601
          ) do |record|
            record.title = message.title
            record.message = message.body
            record.due_count = 0
            record.metadata = {
              source: "daily_ai_message",
              date: message.date.iso8601,
              theme: message.theme
            }
          end
          dispatched += 1 if alert.persisted?
        end

        render json: {
          message: "Mensagem diaria despachada.",
          dispatched_count: dispatched,
          daily_message: serialize_message(message)
        }, status: :ok
      end

      private

      def serialize_message(message)
        {
          id: message.id,
          date: message.date,
          title: message.title,
          body: message.body,
          theme: message.theme
        }
      end

      def authenticate_access_token!
        token = request.headers["Authorization"].to_s.split(" ").last
        payload = JsonWebToken.decode(token, expected_type: "access")
        @current_user = User.find(payload["sub"])
      rescue JWT::DecodeError, ActiveRecord::RecordNotFound
        render json: { error: "Nao autorizado." }, status: :unauthorized
      end

      def authenticate_internal_dispatch!
        provided = request.headers["X-Internal-Dispatch-Token"].to_s
        expected = ENV["DAILY_MESSAGE_DISPATCH_TOKEN"].to_s
        return if expected.present? && ActiveSupport::SecurityUtils.secure_compare(provided, expected)

        render json: { error: "Token interno invalido." }, status: :forbidden
      end
    end
  end
end
