module Api
  module V1
    class TelegramWebhooksController < ApplicationController
      # O bot NAO e um chatbot: o objetivo e ENVIAR notificacoes (lembretes/resumo).
      # Este webhook existe apenas para permitir o vinculo da conta (deep link ?start=<token>).
      #
      # Aceitamos os comandos "iniciar" localizados (ex.: /iniciar em pt-BR, /empezar em es),
      # alem do /start, porque o Telegram envia o comando traduzido conforme o idioma do app.
      START_COMMANDS = %w[/start /iniciar /comecar /começar /empezar /comenzar].freeze

      def webhook
        update = JSON.parse(request.raw_post)

        message = update.dig("message") || update.dig("edited_message")
        return head :ok unless message

        chat_id = (message["chat"] || {})["id"].to_s
        username = (message["from"] || {})["username"].to_s.strip
        text = message["text"].to_s.strip

        if START_COMMANDS.any? { |cmd| text.start_with?(cmd) }
          token = link_token_from(text)
          if token.present?
            link_account(chat_id: chat_id, username: username, token: token)
          else
            reply(chat_id, "Para vincular sua conta, volte ao app e toque em 'Vincular Telegram'. O link já traz o código de confirmação.")
          end
        end

        head :ok
      rescue JSON::ParserError
        head :bad_request
      end

      private

      def link_token_from(text)
        text.split(" ", 2)[1].to_s.strip.presence
      end

      def link_account(chat_id:, username:, token:)
        return if token.blank? || chat_id.blank?

        user_id = TelegramLinkToken.decode(token)
        user = user_id && User.find_by(id: user_id)

        return reply(chat_id, "Link inválido ou expirado. Gere um novo no app.") unless user
        return if user.telegram_chat_id == chat_id
        return reply(chat_id, "Este Telegram já está vinculado a outra conta.") if user.telegram_chat_id.present?

        user.update!(
          telegram_chat_id: chat_id,
          telegram_username: username.presence,
          telegram_opt_in_at: Time.current
        )
        user.update_telegram_preferences!("telegram_notifications_enabled" => true)

        Rails.logger.info "[TelegramWebhook] Linked user #{user.id} to chat_id #{chat_id}"
        reply(chat_id, "Conta vinculada! Você vai receber os avisos do Dívida Zero por aqui.")
      end

      def reply(chat_id, text)
        return unless TelegramProvider.configured?

        TelegramProvider.send_message(chat_id: chat_id, text: text)
      rescue StandardError => e
        Rails.logger.error "[TelegramWebhook] reply failed: #{e.message}"
      end
    end
  end
end
