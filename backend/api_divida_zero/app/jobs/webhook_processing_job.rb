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
    return nil unless item_id

    FinancialConnection.find_by(provider_item_id: item_id, provider: :pluggy)
  end

  def handle_item_created(connection, payload)
    item = payload['item'] || {}
    connection.update!(
      status: map_item_status(item['status']),
      provider_item_id: item['id'],
      last_sync_error: nil
    )
    FinancialSyncJob.perform_later(financial_connection_id: connection.id, sync_type: :full)
  end

  def handle_item_updated(connection, payload)
    item = payload['item'] || {}
    new_status = map_item_status(item['status'])

    connection.update!(
      status: new_status,
      last_sync_error: new_status == 'error' ? item['error'] : nil
    )

    # Se status mudou para active ou credentials_updated, disparar sync
    if %w[active error].include?(new_status)
      FinancialSyncJob.perform_later(financial_connection_id: connection.id, sync_type: :incremental)
    end
  end

  def handle_item_error(connection, payload)
    item = payload['item'] || {}
    connection.update!(
      status: :error,
      last_sync_error: item['error'] || 'Erro desconhecido do provedor'
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

  def map_item_status(pluggy_status)
    case pluggy_status&.downcase
    when 'active', 'connected' then 'active'
    when 'error', 'failed' then 'error'
    when 'pending', 'waiting_user_input', 'waiting_user_action' then 'action_required'
    when 'deleted', 'disconnected' then 'disconnected'
    else 'pending'
    end
  end
end