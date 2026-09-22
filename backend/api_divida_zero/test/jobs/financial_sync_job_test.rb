require 'test_helper'

class FinancialSyncJobTest < ActiveJob::TestCase
  setup do
    FeatureFlag.where(key: 'bank_sync').delete_all
    FeatureFlag.create!(key: 'bank_sync', enabled: true)
    @user = users(:one)
    @connection = FinancialConnection.create!(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'item_123',
      provider_institution_id: 'nubank',
      status: :active
    )
  end

  test 'should perform full sync and create accounts and transactions' do
    adapter_mock = Minitest::Mock.new
    adapter_mock.expect :accounts, [
      { 'id' => 'acc_1', 'name' => 'Conta Corrente', 'type' => 'CHECKING', 'balance' => 1000.0, 'currency' => 'BRL' }
    ], [@connection]
    adapter_mock.expect :transactions, [
      { 'id' => 'txn_1', 'description' => 'SUPERMERCADO', 'amount' => 150.0, 'date' => '2026-09-15', 'type' => 'DEBIT', 'status' => 'POSTED', 'category' => 'Alimentação' },
      { 'id' => 'txn_2', 'description' => 'SALARIO', 'amount' => 5000.0, 'date' => '2026-09-01', 'type' => 'CREDIT', 'status' => 'POSTED', 'category' => 'Salário' }
    ], [@connection, { page: 1, page_size: 500 }]

    FinancialProviders::Factory.stub :build, adapter_mock do
      FinancialSyncJob.perform_now(financial_connection_id: @connection.id, sync_type: :full)
    end

    adapter_mock.verify

    sync = @connection.financial_syncs.last
    assert_equal 'completed', sync.status
    assert_equal 2, sync.records_created # 2 transactions

    assert_equal 1, @connection.financial_accounts.count
    assert_equal 2, @connection.imported_transactions.count
  end

  test 'should perform incremental sync' do
    @connection.update!(last_synced_at: 1.hour.ago)
    FinancialAccount.create!(
      financial_connection: @connection,
      provider_account_id: 'acc_1',
      name: 'Conta Corrente',
      account_type: :checking,
      balance: 1000.0,
      currency: 'BRL'
    )

    adapter_mock = Minitest::Mock.new
    adapter_mock.expect :transactions, [
      { 'id' => 'txn_3', 'description' => 'NOVA TRANSACAO', 'amount' => 100.0, 'date' => '2026-09-17', 'type' => 'DEBIT', 'status' => 'POSTED', 'category' => 'Transporte' }
    ], [@connection, { page: 1, page_size: 500, updated_after: @connection.last_synced_at.iso8601 }]

    FinancialProviders::Factory.stub :build, adapter_mock do
      FinancialSyncJob.perform_now(financial_connection_id: @connection.id, sync_type: :incremental)
    end

    adapter_mock.verify

    sync = @connection.financial_syncs.last
    assert_equal 'incremental', sync.sync_type
    assert_equal 'completed', sync.status
  end

  test 'should handle PluggyAuthError' do
    adapter_mock = Minitest::Mock.new
    adapter_mock.expect(:accounts, nil) do
      raise FinancialProviders::Pluggy::PluggyAuthError, 'Invalid credentials'
    end

    FinancialProviders::Factory.stub :build, adapter_mock do
      FinancialSyncJob.perform_now(financial_connection_id: @connection.id)
    end

    sync = @connection.financial_syncs.last
    assert_equal 'failed', sync.status
    assert_equal 'PluggyAuthError', sync.error_code
    @connection.reload
    assert_equal 'error', @connection.status
  end

  test 'should handle PluggyRateLimitError' do
    adapter_mock = Minitest::Mock.new
    adapter_mock.expect(:accounts, nil) do
      raise FinancialProviders::Pluggy::PluggyRateLimitError, 'Rate limited'
    end

    FinancialProviders::Factory.stub :build, adapter_mock do
      FinancialSyncJob.perform_now(financial_connection_id: @connection.id)
    end

    sync = @connection.financial_syncs.last
    assert_equal 'failed', sync.status
    assert_equal 'PluggyRateLimitError', sync.error_code
  end

  test 'should handle PluggyServerError' do
    adapter_mock = Minitest::Mock.new
    adapter_mock.expect(:accounts, nil) do
      raise FinancialProviders::Pluggy::PluggyServerError, 'Internal server error'
    end

    FinancialProviders::Factory.stub :build, adapter_mock do
      FinancialSyncJob.perform_now(financial_connection_id: @connection.id)
    end

    sync = @connection.financial_syncs.last
    assert_equal 'failed', sync.status
    assert_equal 'PluggyServerError', sync.error_code
  end

  test 'should use DeduplicationService and AiCategorizationService' do
    adapter_mock = Minitest::Mock.new
    adapter_mock.expect :accounts, [], [@connection]
    adapter_mock.expect :transactions, [
      { 'id' => 'txn_dup', 'description' => 'DUPLICADA', 'amount' => 50.0, 'date' => '2026-09-15', 'type' => 'DEBIT', 'status' => 'POSTED' }
    ], [@connection, { page: 1, page_size: 500 }]

    # Mock DeduplicationService para retornar true (duplicata)
    Bank::DeduplicationService.stub :duplicate?, true do
      FinancialProviders::Factory.stub :build, adapter_mock do
        FinancialSyncJob.perform_now(financial_connection_id: @connection.id)
      end
    end

    adapter_mock.verify

    # Não deve criar transação duplicada
    assert_equal 0, @connection.imported_transactions.count
  end

  test 'should enqueue all connections for polling when all_connections: true' do
    conn1 = FinancialConnection.create!(user: @user, provider: :pluggy, provider_item_id: 'item_1', provider_institution_id: 'nubank', status: :active)
    conn2 = FinancialConnection.create!(user: @user, provider: :pluggy, provider_item_id: 'item_2', provider_institution_id: 'itau', status: :active)
    FinancialConnection.create!(user: @user, provider: :manual, provider_item_id: 'manual_1', provider_institution_id: 'manual_upload', status: :active) # não deve ser incluído

    # @connection (setup) + conn1 + conn2 = 3 conexões pluggy ativas
    assert_enqueued_jobs 3, only: FinancialSyncJob do
      FinancialSyncJob.perform_now(all_connections: true)
    end
  end

  test 'should not sync inactive connections' do
    @connection.update!(status: :pending)
    FinancialConnection.create!(user: @user, provider: :pluggy, provider_item_id: 'item_inactive', provider_institution_id: 'bb', status: :pending)

    assert_no_enqueued_jobs only: FinancialSyncJob do
      FinancialSyncJob.perform_now(all_connections: true)
    end
  end

  test 'does nothing when bank_sync is disabled' do
    FeatureFlag.where(key: 'bank_sync').update_all(enabled: false)

    FinancialSyncJob.perform_now(financial_connection_id: @connection.id, sync_type: :full)

    assert_equal 0, @connection.financial_syncs.count
    assert_equal 'active', @connection.reload.status
  end
end