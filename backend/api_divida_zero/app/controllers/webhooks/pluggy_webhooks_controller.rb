class Webhooks::PluggyWebhooksController < ApplicationController
  before_action :verify_signature

  def receive
    event = params[:event] || request.headers['X-Pluggy-Event']
    event_id = params[:eventId] || request.headers['X-Pluggy-Event-Id']

    return head :bad_request if event.blank? || event_id.blank?

    # Idempotência: verificar se já processamos este event_id
    if ProcessedWebhookEvent.exists?(event_id: event_id)
      Rails.logger.info("Webhook duplicado ignorado: #{event_id}")
      return head :ok
    end

    # Enfileirar processamento assíncrono
    WebhookProcessingJob.perform_later(
      event_type: event,
      event_id: event_id,
      payload: request.request_parameters.to_unsafe_h
    )

    head :ok
  rescue StandardError => e
    Rails.logger.error("Webhook receive error: #{e.message}")
    head :bad_request
  end

  private

  def verify_signature
    signature = request.headers['Pluggy-Signature']
    secret = Setting.pluggy_webhook_secret

    return head :unauthorized if signature.blank? || secret.blank?

    expected = OpenSSL::HMAC.hexdigest('SHA256', secret, request.raw_post)
    provided = signature.split('=').last

    unless ActiveSupport::SecurityUtils.secure_compare(expected, provided)
      Rails.logger.warn("Webhook signature verification failed")
      head :unauthorized
    end
  end
end