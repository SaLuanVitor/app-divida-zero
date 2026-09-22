module Api
  module V1
    class TelegramWebhooksController < ApplicationController
      def webhook
        update = JSON.parse(request.raw_post)

        message = update.dig("message") || update.dig("edited_message")
        return head :ok unless message

        chat = message["chat"] || {}
        from = message["from"] || {}
        text = message["text"].to_s.strip
        chat_id = chat["id"].to_s
        username = from["username"].to_s.strip

        # Only process /start with a link token payload
        if text.start_with?("/start ") || text == "/start"
          payload = text.split(" ", 2)[1].to_s.strip

          if payload.present?
            user_id = TelegramLinkToken.decode(payload)
            if user_id
              user = User.find_by(id: user_id)
              if user && user.telegram_chat_id.blank?
                user.update!(
                  telegram_chat_id: chat_id,
                  telegram_username: username.presence,
                  telegram_opt_in_at: Time.current
                )
                user.update_telegram_preferences!("telegram_notifications_enabled" => true)
                Rails.logger.info "[TelegramWebhook] Linked user #{user.id} to chat_id #{chat_id}"
              end
            end
          end
        end

        head :ok
      rescue JSON::ParserError
        head :bad_request
      end
    end
  end
end