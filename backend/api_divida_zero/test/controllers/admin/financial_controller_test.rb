require 'test_helper'

class Admin::FinancialControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = users(:one)
    @admin.update!(role: 'admin')
    @token = JsonWebToken.encode(user_id: @admin.id)
    @headers = { 'Authorization' => "Bearer #{@token}" }

    @regular_user = users(:two)
    @regular_user.update!(role: 'user')
    @regular_token = JsonWebToken.encode(user_id: @regular_user.id)
    @regular_headers = { 'Authorization' => "Bearer #{@regular_token}" }

    @connection = FinancialConnection.create!(
      user: @regular_user,
      provider: :pluggy,
      provider_item_id: 'item_123',
      provider_institution_id: 'nubank',
      status: :active
    )

    FinancialAccount.create!(
      financial_connection: @connection,
      provider_account_id: 'acc_1',
      name: 'Conta Corrente',
      account_type: :checking,
      balance: 1000.0,
      currency: 'BRL'
    )
  end

  test 'should return 403 for non-admin user' do
    get admin_financial_index_url, headers: @regular_headers
    assert_response :forbidden
  end

  test 'should return dashboard for admin' do
    get admin_financial_index_url, headers: @headers
    assert_response :ok
  end

  test 'dashboard shows provider health' do
    get admin_financial_index_url, headers: @headers
    assert_response :ok
    json = JSON.parse(response.body)
    assert json['provider_status']
  end

  test 'dashboard shows connections stats' do
    get admin_financial_index_url, headers: @headers
    assert_response :ok
    json = JSON.parse(response.body)
    assert json['connections_stats']
    assert json['connections_stats']['total']
    assert json['connections_stats']['max_total']
  end

  test 'dashboard shows users stats' do
    get admin_financial_index_url, headers: @headers
    assert_response :ok
    json = JSON.parse(response.body)
    assert json['users_stats']
    assert json['users_stats']['total']
    assert json['users_stats']['max_users']
  end

  test 'dashboard shows last sync' do
    get admin_financial_index_url, headers: @headers
    assert_response :ok
    json = JSON.parse(response.body)
    assert json['last_sync']
  end

  test 'dashboard shows errors 24h' do
    get admin_financial_index_url, headers: @headers
    assert_response :ok
    json = JSON.parse(response.body)
    assert json['errors_24h']
  end

  test 'dashboard shows queue depth' do
    get admin_financial_index_url, headers: @headers
    assert_response :ok
    json = JSON.parse(response.body)
    assert json['queue_depth']
  end

  test 'dashboard shows recent syncs' do
    get admin_financial_index_url, headers: @headers
    assert_response :ok
    json = JSON.parse(response.body)
    assert json['recent_syncs']
  end

  test 'connections endpoint returns paginated connections' do
    get admin_financial_connections_url, headers: @headers
    assert_response :ok
    json = JSON.parse(response.body)
    assert json['connections']
    assert json['connections'].is_a?(Array)
  end

  test 'connections endpoint filters by status' do
    FinancialConnection.create!(
      user: @regular_user,
      provider: :pluggy,
      provider_item_id: 'item_456',
      provider_institution_id: 'itau',
      status: :pending
    )

    get admin_financial_connections_url, headers: @headers, params: { status: 'pending' }
    assert_response :ok
    json = JSON.parse(response.body)
    assert_equal 1, json['connections'].size
    assert_equal 'pending', json['connections'].first['status']
  end

  test 'connections endpoint filters by provider' do
    get admin_financial_connections_url, headers: @headers, params: { provider: 'pluggy' }
    assert_response :ok
    json = JSON.parse(response.body)
    assert json['connections'].all? { |c| c['provider'] == 'pluggy' }
  end

  test 'sync_logs endpoint returns paginated syncs' do
    FinancialSync.create!(
      financial_connection: @connection,
      provider: 'pluggy',
      sync_type: :full,
      status: :completed,
      started_at: Time.current,
      finished_at: Time.current,
      records_created: 10
    )

    get admin_financial_sync_logs_url, headers: @headers
    assert_response :ok
    json = JSON.parse(response.body)
    assert json['syncs']
    assert json['syncs'].is_a?(Array)
  end
end