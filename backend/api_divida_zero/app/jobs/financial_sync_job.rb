class FinancialSyncJob < ApplicationJob
  queue_as :financial_sync

  def perform(financial_connection_id: nil, sync_type: :full, all_connections: false)
    if all_connections
      FinancialConnection.active.where(provider: :pluggy).find_each do |connection|
        FinancialSyncJob.perform_later(financial_connection_id: connection.id, sync_type: :incremental)
      end
      return
    end

    connection = FinancialConnection.find(financial_connection_id)
    return unless connection.active? || connection.action_required?

    adapter = FinancialProviders::Factory.build(connection.provider)

    sync_record = connection.financial_syncs.create!(
      provider: connection.provider,
      sync_type: sync_type,
      status: :processing,
      started_at: Time.current
    )

    begin
      if sync_type == :full || sync_type == :manual_upload || connection.financial_accounts.empty?
        sync_accounts(connection, adapter, sync_record)
      end

      sync_transactions(connection, adapter, sync_record, sync_type)

      sync_record.mark_completed!(
        records_created: @records_created,
        records_updated: @records_updated,
        records_deleted: @records_deleted
      )

      connection.update!(last_synced_at: Time.current, last_sync_error: nil, status: :active)

    rescue FinancialProviders::Pluggy::PluggyApiError => e
      handle_api_error(connection, sync_record, e)
    rescue StandardError => e
      handle_unexpected_error(connection, sync_record, e)
    end
  end

  private

  def sync_accounts(connection, adapter, sync_record)
    # Manual provider doesn't have accounts
    return [] if connection.manual?

    accounts = adapter.accounts(connection)

    accounts.each do |acc_data|
      account = connection.financial_accounts.find_or_initialize_by(
        provider_account_id: acc_data['id']
      )

      account.assign_attributes(
        name: acc_data['name'],
        account_type: map_account_type(acc_data['type']),
        balance: acc_data['balance']&.to_f || 0.0,
        currency: acc_data['currency'] || 'BRL'
      )

      if account.new_record?
        account.save!
        @records_created ||= 0; @records_created += 1
      elsif account.changed?
        account.save!
        @records_updated ||= 0; @records_updated += 1
      end
    end
  end

  def sync_transactions(connection, adapter, sync_record, sync_type)
    @records_created = 0
    @records_updated = 0
    @records_deleted = 0

    params = {}
    params[:updated_after] = connection.last_synced_at.iso8601 if sync_type == :incremental && connection.last_synced_at

    page = 1
    loop do
      params[:page] = page
      params[:page_size] = 500

      transactions = adapter.transactions(connection, params)
      break if transactions.empty?

      normalized = if connection.manual?
                     TransactionNormalizer.normalize(transactions, provider: :manual)
                   else
                     TransactionNormalizer.normalize(transactions, provider: :pluggy)
                   end

      normalized.each do |txn|
        save_transaction(connection, txn)
      end

      break if transactions.size < 500
      page += 1
    end

    sync_record.records_created = @records_created
    sync_record.records_updated = @records_updated
    sync_record.records_deleted = @records_deleted
  end

  def save_transaction(connection, txn_data)
    # Usar fit_id para deduplicação (id do Pluggy ou hash manual)
    transaction = connection.imported_transactions.find_or_initialize_by(fit_id: txn_data[:fit_id])

    transaction.assign_attributes(
      description: txn_data[:description],
      amount: txn_data[:amount],
      date: txn_data[:date],
      flow_type: txn_data[:flow_type],
      suggested_category: txn_data[:category],
      original_category: txn_data[:category],
      status: 'pending'
    )

    if transaction.new_record?
      # Deduplicação adicional por descrição + valor + data
      return if Bank::DeduplicationService.duplicate?(
        connection.user,
        txn_data[:description],
        txn_data[:amount],
        txn_data[:date]
      )

      transaction.save!
      @records_created += 1

      # Categorização por IA
      Bank::AiCategorizationService.categorize!(transaction)
    elsif transaction.changed?
      transaction.save!
      @records_updated += 1
    end
  end

  def map_account_type(pluggy_type)
    case pluggy_type&.downcase
    when 'checking', 'conta_corrente' then 'checking'
    when 'savings', 'poupanca' then 'savings'
    when 'credit_card', 'cartao_credito' then 'credit_card'
    when 'investment', 'investimento' then 'investment'
    when 'loan', 'emprestimo' then 'loan'
    else 'other'
    end
  end

  def handle_api_error(connection, sync_record, error)
    error_msg = case error
                when FinancialProviders::Pluggy::PluggyAuthError
                  'Credenciais inválidas ou expiradas'
                when FinancialProviders::Pluggy::PluggyRateLimitError
                  'Rate limit excedido'
                when FinancialProviders::Pluggy::PluggyNotFoundError
                  'Recurso não encontrado no provedor'
                when FinancialProviders::Pluggy::PluggyServerError
                  'Erro no servidor do provedor'
                else
                  error.message
                end

    sync_record.mark_failed!(error_code: error.class.name.demodulize, error_message: error_msg)
    connection.update!(status: :error, last_sync_error: error_msg)

    # Se auth error, marcar connection como error
    if error.is_a?(FinancialProviders::Pluggy::PluggyAuthError)
      connection.update!(status: :error)
    end
  end

  def handle_unexpected_error(connection, sync_record, error)
    Rails.logger.error("FinancialSyncJob unexpected error: #{error.message}\n#{error.backtrace.join("\n")}")
    sync_record.mark_failed!(error_code: 'UNEXPECTED_ERROR', error_message: error.message)
    connection.update!(status: :error, last_sync_error: "Erro inesperado: #{error.message}")
  end
end