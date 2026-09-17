class WelcomeMailer < ApplicationMailer
  # Enviado após Api::V1::AuthController#register. Não deve bloquear o cadastro
  # se o SMTP falhar — sempre disparado via `deliver_later`.
  def welcome(user)
    @user = user

    mail(to: user.email, subject: "Bem-vindo(a) ao App Dívida Zero!")
  end
end
