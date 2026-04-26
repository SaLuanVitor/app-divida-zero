module Api
  module V1
    class NotificationsController < ApplicationController
      before_action :authenticate_access_token!

      def history
        alerts = @current_user.notification_alerts.recent_first.limit(120)

        render json: { notifications: alerts.map(&:serialize) }, status: :ok
      end

      def read_all
        unread_scope = @current_user.notification_alerts.unread
        updated_count = unread_scope.update_all(read_at: Time.current)

        render json: { updated_count: updated_count }, status: :ok
      end

      private
      def authenticate_access_token!
        super
      end
    end
  end
end
