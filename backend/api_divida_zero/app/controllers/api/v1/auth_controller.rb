require "digest"
require "securerandom"

module Api
  module V1
    class AuthController < ApplicationController
      before_action :authenticate_access_token!, only: [:me, :update_profile, :change_password]

      def register
        user = User.new(register_params)
        user.save!

        render_auth_payload(user, status: :created)
      end

      def login
        user = User.find_by(email: params.require(:email).to_s.strip.downcase)
        password = params.require(:password)

        unless user&.authenticate(password)
          return render json: { error: "Usuário ou senha inválidos." }, status: :unauthorized
        end
        unless user.active?
          return render json: { error: "Conta inativa. Entre em contato com o administrador." }, status: :forbidden
        end

        user.update!(last_login_at: Time.current)

        render_auth_payload(user)
      end

      def refresh
        refresh_token = params[:refresh_token].presence || bearer_token
        payload = JsonWebToken.decode(refresh_token, expected_type: "refresh")
        user = User.find(payload["sub"])
        unless user.active?
          return render json: { error: "Conta inativa. Entre em contato com o administrador." }, status: :forbidden
        end

        render_auth_payload(user)
      rescue JWT::DecodeError, ActiveRecord::RecordNotFound
        render json: { error: "Refresh token inválido." }, status: :unauthorized
      end

      def forgot_password
        user = User.find_by(email: params.require(:email).to_s.strip.downcase)

        if user
          raw_token = SecureRandom.hex(24)
          user.update!(
            reset_password_token_digest: Digest::SHA256.hexdigest(raw_token),
            reset_password_sent_at: Time.current
          )

          response = { message: "Se o usuário existir, as instruções foram enviadas." }
          response[:dev_reset_token] = raw_token if Rails.env.development? || Rails.env.test?
          return render json: response, status: :ok
        end

        render json: { message: "Se o usuário existir, as instruções foram enviadas." }, status: :ok
      end

      def reset_password
        user = User.find_by(email: params.require(:email).to_s.strip.downcase)
        token = params.require(:token).to_s
        password = params.require(:password).to_s

        unless user&.reset_password_token_digest.present?
          return render json: { error: "Token inválido ou expirado." }, status: :unprocessable_entity
        end

        token_digest = Digest::SHA256.hexdigest(token)
        expired = user.reset_password_sent_at.nil? || user.reset_password_sent_at < 30.minutes.ago

        if user.reset_password_token_digest != token_digest || expired
          return render json: { error: "Token inválido ou expirado." }, status: :unprocessable_entity
        end

        user.password = password
        user.password_confirmation = password
        user.reset_password_token_digest = nil
        user.reset_password_sent_at = nil
        user.force_password_change = false
        user.save!

        render json: { message: "Senha atualizada com sucesso." }, status: :ok
      end

      def me
        render json: { user: @current_user.public_payload }, status: :ok
      end

      def update_profile
        attrs = profile_params.to_h.symbolize_keys
        validation_error = validate_profile_appearance(attrs)
        if validation_error
          return render json: { error: validation_error }, status: :unprocessable_entity
        end

        @current_user.update!(attrs)

        render json: {
          message: "Dados do usuário atualizados com sucesso.",
          user: @current_user.public_payload
        }, status: :ok
      end

      def change_password
        current_password = params.require(:current_password).to_s
        new_password = params.require(:new_password).to_s

        unless @current_user.authenticate(current_password)
          return render json: { error: "A senha atual está incorreta." }, status: :unprocessable_entity
        end

        if current_password == new_password
          return render json: { error: "A nova senha deve ser diferente da atual." }, status: :unprocessable_entity
        end

        @current_user.password = new_password
        @current_user.password_confirmation = new_password
        @current_user.force_password_change = false
        @current_user.save!

        render json: { message: "Senha alterada com sucesso." }, status: :ok
      end

      private

      def register_params
        params.fetch(:auth, params).permit(:name, :email, :password)
      end

      def render_auth_payload(user, status: :ok)
        tokens = JsonWebToken.issue_pair(user_id: user.id)

        render json: {
          user: user.public_payload,
          access_token: tokens[:access_token],
          refresh_token: tokens[:refresh_token]
        }, status: status
      end
      def authenticate_access_token!
        super
      end

      def profile_params
        params.permit(:name, :email, :profile_icon_key, :profile_frame_key)
      end

      def validate_profile_appearance(attrs)
        return nil if attrs.empty?

        level = nil

        if attrs.key?(:profile_icon_key)
          icon_key = attrs[:profile_icon_key].to_s
          return "Ícone de perfil inválido." unless ProfileAppearanceCatalog.valid_icon_key?(icon_key)

          level ||= GamificationService.summary_for(@current_user)[:level]
          return "Ícone de perfil bloqueado para seu nível atual." unless ProfileAppearanceCatalog.icon_unlocked?(icon_key, level)
        end

        if attrs.key?(:profile_frame_key)
          frame_key = attrs[:profile_frame_key].to_s
          return "Borda de perfil inválida." unless ProfileAppearanceCatalog.valid_frame_key?(frame_key)

          level ||= GamificationService.summary_for(@current_user)[:level]
          return "Borda de perfil bloqueada para seu nível atual." unless ProfileAppearanceCatalog.frame_unlocked?(frame_key, level)
        end

        nil
      end

      def bearer_token
        request.headers["Authorization"].to_s.split(" ").last.presence || params[:token].to_s
      end
    end
  end
end
