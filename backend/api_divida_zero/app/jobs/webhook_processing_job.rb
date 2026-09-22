class WebhookProcessingJob < ApplicationJob
  queue_as :webhooks

  def perform(event_type:, event_id:, payload:)
    # Double-check idempotência no job também
    return if ProcessedWebhookEvent.processed?(event_id)

    connection = find_connection(payload)
    return unless connection

    case event_type
    when 'item/created'
      handle_item_created(connection, payload)
    when 'item/updated'
      handle_item_updated(connection, payload)
    when 'item/error'
      handle_item_error(connection, payload)
    when 'item/deleted'
      handle_item_deleted(connection, payload)
    when 'transactions/created', 'transactions/updated', 'transactions/deleted'
      handle_transactions_changed(connection, event_type)
    when 'item/waiting_user_input', 'item/waiting_user_action'
      handle_action_required(connection, payload)
    else
      Rails.logger.info("Webhook event não tratado: #{event_type}")
    end

    ProcessedWebhookEvent.mark_processed!(event_id, event_type)
  rescue StandardError => e
    Rails.logger.error("WebhookProcessingJob failed: #{e.message}")
    # Não re-raise para não tentar novamente indefinidamente
    # O evento fica sem marcar como processado, permitindo retry manual se necessário
  end

  private

  def find_connection(payload)
    item_id = payload.dig('item', 'id') || payload['itemId']

    if item_id.present?
      connection = FinancialConnection.find_by(provider_item_id: item_id, provider: :pluggy)
      return connection if connection
    end

    # Item recém-criado: o itemId ainda não era conhecido no create_connection,
    # então localizamos a conexão pendente do usuário via clientUserId.
    client_user_id = payload['clientUserId']
    return nil if client_user_id.blank?

    user_id = Integer(client_user_id, exception: false)
    return nil unless user_id

    FinancialConnection.where(provider: :pluggy, status: :pending, user_id: user_id)
                       .order(created_at: :desc)
                       .first
  end

  def handle_item_created(connection, payload)
    item_id = payload['itemId'] || payload.dig('item', 'id')
    connection.update!(
      status: :active,
      provider_item_id: item_id || connection.provider_item_id,
      last_sync_error: nil
    )
    FinancialSyncJob.perform_later(financial_connection_id: connection.id, sync_type: :full)
  end

  def handle_item_updated(connection, payload)
    item_id = payload['itemId'] || payload.dig('item', 'id')
    connection.update!(
      status: :active,
      provider_item_id: item_id || connection.provider_item_id,
      last_sync_error: nil
    )
    FinancialSyncJob.perform_later(financial_connection_id: connection.id, sync_type: :incremental)
  end

  def handle_item_error(connection, payload)
    error = payload['error'] || {}
    connection.update!(
      status: :error,
      last_sync_error: error['message'] || error['code'] || 'Erro desconhecido do provedor'
    )
  end

  def handle_item_deleted(connection, payload)
    connection.update!(status: :disconnected)
  end

  def handle_transactions_changed(connection, event_type)
    # Sync incremental para mudanças de transações
    FinancialSyncJob.perform_later(financial_connection_id: connection.id, sync_type: :incremental)
  end

  def handle_action_required(connection, payload)
    item = payload['item'] || {}
    connection.update!(
      status: :action_required,
      last_sync_error: item['error'] || 'Ação do usuário necessária'
    )
    # TODO: Notificar usuário via push/email
  end

end