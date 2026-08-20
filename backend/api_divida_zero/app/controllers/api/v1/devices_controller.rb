module Api
  module V1
    class DevicesController < ApplicationController
      before_action :authenticate_access_token!

      def create
        token = device_params[:expo_push_token].to_s.strip
        platform = device_params[:platform].to_s.strip.downcase

        if token.blank?
          return render json: { error: "Token push é obrigatório." }, status: :unprocessable_content
        end

        unless DeviceToken::PLATFORMS.include?(platform)
          return render json: { error: "Plataforma inválida." }, status: :unprocessable_content
        end

        @current_user.update_push_preferences!(device_params[:push_preferences])
        device_token = upsert_device_token!(token:, platform:)

        render json: { device: serialize_device(device_token) }, status: :ok
      end

      def destroy
        token = device_params[:expo_push_token].to_s.strip
        scope = @current_user.device_tokens
        scope = scope.where(expo_push_token: token) if token.present?
        removed_count = scope.delete_all

        render json: { removed_count: removed_count }, status: :ok
      end

      private

      def device_params
        params.permit(
          :expo_push_token,
          :platform,
          push_preferences: %i[
            notifications_enabled
            device_push_enabled
            notify_due_today
            notify_due_tomorrow
            notify_weekly_summary
          ]
        )
      end

      def upsert_device_token!(token:, platform:)
        now = Time.current
        existing = DeviceToken.find_by(expo_push_token: token)

        if existing.present? && existing.user_id != @current_user.id
          existing.destroy!
        end

        device_token = @current_user.device_tokens.find_or_initialize_by(expo_push_token: token)
        device_token.platform = platform
        device_token.last_seen_at = now
        device_token.save!
        device_token
      end

      def serialize_device(device_token)
        {
          id: device_token.id,
          expo_push_token: device_token.expo_push_token,
          platform: device_token.platform,
          last_seen_at: device_token.last_seen_at
        }
      end
    end
  end
end
