class PasswordResetMailer < ApplicationMailer
  # Envia o token de redefinição de senha gerado em Api::V1::AuthController#forgot_password.
  # O token é válido por 30 minutos (ver AuthController#reset_password).
  def reset_email(user, raw_token)
    @user = user
    @token = raw_token
    @valid_for_minutes = 30

    mail(to: user.email, subject: "Redefinição de senha — App Dívida Zero")
  end
end
