# frozen_string_literal: true

namespace :smtp do
  desc "Testar entrega SMTP — envia e-mail de teste para o endereço informado"
  task :test, [:email] => :environment do |_t, args|
    recipient = args[:email]

    if recipient.blank?
      abort <<~MSG
        Uso: bin/rails "smtp:test[seu@email.com]"

        Variáveis necessárias (via .env ou env):
          SMTP_ADDRESS, SMTP_PORT, SMTP_USER_NAME, SMTP_PASSWORD, MAILER_FROM
      MSG
    end

    puts "🔍 Verificando configuração SMTP..."
    puts "   SMTP_ADDRESS  = #{ENV.fetch('SMTP_ADDRESS', '(não definido)')}"
    puts "   SMTP_PORT     = #{ENV.fetch('SMTP_PORT', '(não definido)')}"
    puts "   SMTP_USER     = #{ENV.fetch('SMTP_USER_NAME', '(não definido)')}"
    puts "   MAILER_FROM   = #{ENV.fetch('MAILER_FROM', '(não definido)')}"
    puts "   Destinatário  = #{recipient}"
    puts

    # Forçar delivery_method :smtp para o teste (em dev o padrão é :test)
    ActionMailer::Base.delivery_method = :smtp

    begin
      test_user = User.find_by(email: recipient)

      if test_user
        puts "📤 Enviando WelcomeMailer para #{recipient}..."
        WelcomeMailer.welcome(test_user).deliver_now
        puts "✅ WelcomeMailer enviado com sucesso!"
      else
        puts "ℹ️  Usuário #{recipient} não encontrado no banco."
        puts "   Criando e-mail de teste direto via ActionMailer..."
        mail = ActionMailer::Base.mail(
          from: ENV.fetch("MAILER_FROM", "onboarding@resend.dev"),
          to: recipient,
          subject: "Teste SMTP — App Dívida Zero",
          body: "Se você recebeu este e-mail, o SMTP está funcionando corretamente! 🎉"
        )
        mail.deliver_now
        puts "✅ E-mail de teste enviado com sucesso!"
      end

      puts
      puts "📧 Verifique a caixa de entrada de #{recipient}"
      puts "   (pode demorar alguns segundos; confira também a pasta spam)"
    rescue StandardError => e
      puts
      puts "❌ Falha no envio SMTP:"
      puts "   #{e.class}: #{e.message}"
      puts
      puts "   Verifique:"
      puts "   1. SMTP_ADDRESS/SMTP_PORT/SMTP_USER_NAME/SMTP_PASSWORD estão corretos?"
      puts "   2. O firewall bloqueia porta 587?"
      puts "   3. A API key do Resend ainda é válida?"
      exit 1
    end
  end

  desc "Testar notificação de lembrete de vencimento por e-mail"
  task :test_due_reminder, [:email] => :environment do |_t, args|
    recipient = args[:email]
    abort "Uso: bin/rails \"smtp:test_due_reminder[seu@email.com]\"" if recipient.blank?

    user = User.find_by(email: recipient)
    abort "Usuário #{recipient} não encontrado." unless user

    # Criar um alerta de teste temporário
    alert = user.notification_alerts.create!(
      alert_type: "due_today",
      window_key: "smtp-test-#{Time.current.to_i}",
      title: "Teste: contas para vencimento hoje",
      message: "Este é um e-mail de teste do lembrete de vencimento.",
      due_count: 1,
      metadata: { due_count: 1, generated_at: Time.zone.now.iso8601, test: true }
    )

    ActionMailer::Base.delivery_method = :smtp

    puts "📤 Enviando NotificationMailer.due_reminder..."
    NotificationMailer.due_reminder(user, alert).deliver_now
    puts "✅ E-mail de lembrete enviado!"
    puts "📧 Verifique a caixa de entrada de #{recipient}"

    alert.destroy # Limpar alerta de teste
  end

  desc "Testar resumo semanal por e-mail"
  task :test_weekly_summary, [:email] => :environment do |_t, args|
    recipient = args[:email]
    abort "Uso: bin/rails \"smtp:test_weekly_summary[seu@email.com]\"" if recipient.blank?

    user = User.find_by(email: recipient)
    abort "Usuário #{recipient} não encontrado." unless user

    today = Date.current
    week_start = today.beginning_of_week(:monday)

    alert = user.notification_alerts.create!(
      alert_type: "weekly_summary",
      window_key: "smtp-test-weekly-#{Time.current.to_i}",
      title: "Resumo semanal da conta",
      message: "Resumo semanal de teste.",
      due_count: 0,
      metadata: {
        "week_start" => week_start.iso8601,
        "week_end" => today.iso8601,
        "pending_income_total" => "1500.00",
        "pending_expense_total" => "800.00",
        "projected_balance" => "700.00",
        "test" => true
      }
    )

    ActionMailer::Base.delivery_method = :smtp

    puts "📤 Enviando NotificationMailer.weekly_summary..."
    NotificationMailer.weekly_summary(user, alert).deliver_now
    puts "✅ E-mail de resumo semanal enviado!"
    puts "📧 Verifique a caixa de entrada de #{recipient}"

    alert.destroy
  end
end
