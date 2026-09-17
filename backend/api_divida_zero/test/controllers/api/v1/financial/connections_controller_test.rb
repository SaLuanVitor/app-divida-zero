require 'test_helper'

class Api::V1::Financial::ConnectionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @token = JsonWebToken.encode(user_id: @user.id)
    @headers = { 'Authorization' => "Bearer #{@token}" }
  end

  test 'should return 403 when open_finance disabled' do
    FeatureFlag.disable('open_finance')

    post api_v1_financial_connections_url, headers: @headers, params: { institution_id: 'nubank' }, as: :json
    assert_response :forbidden
  end

  test 'should create connection and return connect_token' do
    FeatureFlag.enable('open_finance')

    # Mock the adapter
    adapter_mock = Minitest::Mock.new
    adapter_mock.expect :create_connection, { connect_token: 'token_123', connect_url: 'https://connect.pluggy.ai/?connectToken=token_123', item_id: 'item_456' }, [@user]

    FinancialProviders::Factory.stub :build, adapter_mock do
      post api_v1_financial_connections_url, headers: @headers, params: { institution_id: 'nubank' }, as: :json
    end

    assert_response :created
    json = JSON.parse(response.body)
    assert json['connect_token']
    assert json['connect_url']
    assert json['connection']['provider_item_id']

    adapter_mock.verify
  end

  test 'should handle Pluggy API error on create' do
    FeatureFlag.enable('open_finance')

    adapter_mock = Minitest::Mock.new
    adapter_mock.expect :create_connection, nil, [@user] do
      raise FinancialProviders::Pluggy::PluggyAuthError, 'Invalid credentials'
    end

    FinancialProviders::Factory.stub :build, adapter_mock do
      post api_v1_financial_connections_url, headers: @headers, params: { institution_id: 'nubank' }, as: :json
    end

    assert_response :bad_gateway
    adapter_mock.verify
  end

  test 'should show connection with accounts and last sync' do
    FeatureFlag.enable('open_finance')

    connection = FinancialConnection.create!(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'item_123',
      provider_institution_id: 'nubank',
      status: :active
    )

    FinancialAccount.create!(
      financial_connection: connection,
      provider_account_id: 'acc_1',
      name: 'Conta Corrente',
      account_type: :checking,
      balance: 1000.0,
      currency: 'BRL'
    )

    get api_v1_financial_connection_url(connection), headers: @headers
    assert_response :ok

    json = JSON.parse(response.body)
    assert_equal connection.id, json['connection']['id']
    assert_equal 1, json['connection']['financial_accounts'].size
  end

  test 'should destroy connection' do
    FeatureFlag.enable('open_finance')

    connection = FinancialConnection.create!(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'item_123',
      provider_institution_id: 'nubank',
      status: :active
    )

    adapter_mock = Minitest::Mock.new
    adapter_mock.expect :disconnect_connection, nil, [connection]

    FinancialProviders::Factory.stub :build, adapter_mock do
      delete api_v1_financial_connection_url(connection), headers: @headers
    end

    assert_response :no_content
    assert_not FinancialConnection.exists?(connection.id)
    adapter_mock.verify
  end

  test 'should enqueue sync job' do
    FeatureFlag.enable('open_finance')

    connection = FinancialConnection.create!(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'item_123',
      provider_institution_id: 'nubank',
      status: :active
    )

    assert_enqueued_with(job: FinancialSyncJob, args: { financial_connection_id: connection.id, sync_type: :full }) do
      post sync_api_v1_financial_connection_url(connection), headers: @headers
    end

    assert_response :accepted
  end

  test 'should return 403 when connection limit exceeded' do
    FeatureFlag.enable('open_finance')

    # Create 3 connections (free plan limit)
    3.times do |i|
      FinancialConnection.create!(
        user: @user,
        provider: :pluggy,
        provider_item_id: "item_#{i}",
        provider_institution_id: 'nubank',
        status: :active
      )
    end

    adapter_mock = Minitest::Mock.new
    adapter_mock.expect :create_connection, { connect_token: 'token', connect_url: 'url', item_id: 'item_new' }, [@user]

    FinancialProviders::Factory.stub :build, adapter_mock do
      post api_v1_financial_connections_url, headers: @headers, params: { institution_id: 'nubank' }, as: :json
    end

    assert_response :forbidden
    json = JSON.parse(response.body)
    assert json['limit_exceeded']
    assert_equal 'connections', json['resource']
  end

  test 'should return limits info in create response' do
    FeatureFlag.enable('open_finance')

    adapter_mock = Minitest::Mock.new
    adapter_mock.expect :create_connection, { connect_token: 'token_123', connect_url: 'https://connect.pluggy.ai/?connectToken=token_123', item_id: 'item_456' }, [@user]

    FinancialProviders::Factory.stub :build, adapter_mock do
      post api_v1_financial_connections_url, headers: @headers, params: { institution_id: 'nubank' }, as: :json
    end

    assert_response :created
    json = JSON.parse(response.body)
    assert json['limits']
    assert json['limits']['connections']
    assert json['limits']['connections']['used']
    assert json['limits']['connections']['limit']
    assert json['limits']['connections']['remaining']
    assert json['limits']['connections']['percentage']
    assert json['limits']['connections']['status']
  end

  test 'should return limits info in show response' do
    FeatureFlag.enable('open_finance')

    connection = FinancialConnection.create!(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'item_123',
      provider_institution_id: 'nubank',
      status: :active
    )

    get api_v1_financial_connection_url(connection), headers: @headers
    assert_response :ok

    json = JSON.parse(response.body)
    assert json['limits']
    assert json['limits']['connections']
    assert json['limits']['accounts']
    assert json['limits']['syncs']
  end

  test 'should return 403 when sync limit exceeded' do
    FeatureFlag.enable('open_finance')

    connection = FinancialConnection.create!(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'item_123',
      provider_institution_id: 'nubank',
      status: :active
    )

    # Create 2 syncs today (free plan limit is 2)
    2.times do
      FinancialSync.create!(
        financial_connection: connection,
        provider: 'pluggy',
        sync_type: :full,
        status: :completed,
        started_at: Time.current
      )
    end

    post sync_api_v1_financial_connection_url(connection), headers: @headers

    assert_response :forbidden
    json = JSON.parse(response.body)
    assert json['limit_exceeded']
    assert_equal 'syncs', json['resource']
  end
end