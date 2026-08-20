module Api
  module V1
    class WhatsappController < ApplicationController
      before_action :verify_webhook_token

      def webhook
        payload = JSON.parse(request.body.read)
        status_updates = extract_status_updates(payload)

        status_updates.each do |update|
          process_status_update(update)
        end

        head :ok
      rescue JSON::ParserError
        head :bad_request
      end

      def verify
        challenge = params["hub.challenge"]
        verify_token = params["hub.verify_token"]

        if verify_token == ENV.fetch("WHATSAPP_WEBHOOK_SECRET")
          render plain: challenge
        else
          head :forbidden
        end
      end

      private

      def verify_webhook_token
        return if request.method == "GET"

        token = request.headers["X-Webhook-Token"] || params[:token]
        expected = ENV.fetch("WHATSAPP_WEBHOOK_SECRET", nil)
        return if expected.blank? || token == expected

        head :unauthorized
      end

      def extract_status_updates(payload)
        entries = Array(payload["entry"])
        entries.flat_map do |entry|
          changes = Array(entry.dig("changes"))
          changes.flat_map do |change|
            statuses = Array(change.dig("value", "statuses"))
            statuses.map { |s| { message_id: s["id"], status: s["status"], error: s.dig("errors", 0, "message") } }
          end
        end
      end

      def process_status_update(update)
        message = WhatsappMessage.find_by(provider_message_id: update[:message_id])
        return unless message

        mapped = map_status(update[:status])
        message.transition_to!(mapped, error: update[:error])
      end

      def map_status(provider_status)
        case provider_status.to_s
        when "sent" then "sent"
        when "delivered" then "delivered"
        when "read" then "read"
        when "failed" then "failed"
        else "failed"
        end
      end
    end
  end
end
