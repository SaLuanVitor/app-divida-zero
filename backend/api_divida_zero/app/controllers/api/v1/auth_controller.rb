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

        render_auth_payload(user)
      end

      def refresh
        refresh_token = params[:refresh_token].presence || bearer_token
        payload = JsonWebToken.decode(refresh_token, expected_type: "refresh")
        user = User.find(payload["sub"])

        render_auth_payload(user)
      rescue JWT::DecodeError, ActiveRecord::RecordNotFound
        render json: { error: "Refresh token invalido." }, status: :unauthorized
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
          return render json: { error: "Token invalido ou expirado." }, status: :unprocessable_entity
        end

        token_digest = Digest::SHA256.hexdigest(token)
        expired = user.reset_password_sent_at.nil? || user.reset_password_sent_at < 30.minutes.ago

        if user.reset_password_token_digest != token_digest || expired
          return render json: { error: "Token invalido ou expirado." }, status: :unprocessable_entity
        end

        user.password = password
        user.password_confirmation = password
        user.reset_password_token_digest = nil
        user.reset_password_sent_at = nil
        user.save!

        render json: { message: "Senha atualizada com sucesso." }, status: :ok
      end

      def me
        render json: { user: @current_user.public_payload }, status: :ok
      end

      def update_profile
        @current_user.update!(profile_params)

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
        payload = JsonWebToken.decode(bearer_token, expected_type: "access")
        @current_user = User.find(payload["sub"])
      rescue JWT::DecodeError, ActiveRecord::RecordNotFound
        render json: { error: "Não autorizado." }, status: :unauthorized
      end

      def profile_params
        params.permit(:name, :email)
      end

      def bearer_token
        request.headers["Authorization"].to_s.split(" ").last.presence || params[:token].to_s
      end
    end
  end
end
