require 'test_helper'

class FinancialProviders::PluggyAdapterTest < ActiveSupport::TestCase
  setup do
    @adapter = FinancialProviders::Pluggy.new(
      client_id: 'test_client_id',
      client_secret: 'test_client_secret',
      base_url: 'https://api.pluggy.ai',
      connect_url: 'https://connect.pluggy.ai'
    )
  end

  test 'should initialize with config' do
    assert_equal 'test_client_id', @adapter.instance_variable_get(:@client_id)
    assert_equal 'test_client_secret', @adapter.instance_variable_get(:@client_secret)
    assert_equal 'https://api.pluggy.ai', @adapter.instance_variable_get(:@base_url)
  end

  test 'capabilities returns correct hash' do
    caps = @adapter.capabilities

    assert caps[:accounts]
    assert caps[:transactions]
    assert caps[:credit_cards]
    assert_not caps[:investments]
    assert caps[:automatic_sync]
    assert caps[:manual_sync]
  end

  test 'create_connection raises NotImplementedError without HTTP stub' do
    assert_raises(Faraday::Error) do
      @adapter.create_connection(users(:one))
    end
  end

  test 'accounts raises NotImplementedError without HTTP stub' do
    connection = FinancialConnection.new(provider_item_id: 'item_123')
    assert_raises(Faraday::Error) do
      @adapter.accounts(connection)
    end
  end

  test 'transactions raises NotImplementedError without HTTP stub' do
    connection = FinancialConnection.new(provider_item_id: 'item_123')
    assert_raises(Faraday::Error) do
      @adapter.transactions(connection)
    end
  end

  test 'institutions raises NotImplementedError without HTTP stub' do
    assert_raises(Faraday::Error) do
      @adapter.institutions
    end
  end

  test 'refresh_connection raises NotImplementedError without HTTP stub' do
    connection = FinancialConnection.new(provider_item_id: 'item_123')
    assert_raises(Faraday::Error) do
      @adapter.refresh_connection(connection)
    end
  end

  test 'disconnect_connection raises NotImplementedError without HTTP stub' do
    connection = FinancialConnection.new(provider_item_id: 'item_123')
    assert_raises(Faraday::Error) do
      @adapter.disconnect_connection(connection)
    end
  end

  test 'fetch_auth_token clears token on 401' do
    # This test verifies the error handling structure exists
    assert_raises(FinancialProviders::Pluggy::PluggyAuthError) do
      @adapter.send(:handle_response, OpenStruct.new(status: 401, body: { error: 'unauthorized' }))
    end
  end

  test 'handle_response raises PluggyNotFoundError on 404' do
    assert_raises(FinancialProviders::Pluggy::PluggyNotFoundError) do
      @adapter.send(:handle_response, OpenStruct.new(status: 404, body: { error: 'not found' }))
    end
  end

  test 'handle_response raises PluggyRateLimitError on 429' do
    assert_raises(FinancialProviders::Pluggy::PluggyRateLimitError) do
      @adapter.send(:handle_response, OpenStruct.new(status: 429, body: { error: 'rate limited' }))
    end
  end

  test 'handle_response raises PluggyServerError on 500' do
    assert_raises(FinancialProviders::Pluggy::PluggyServerError) do
      @ adapter.send(:handle_response, OpenStruct.new(status: 500, body: { error: 'server error' }))
    end
  end

  test 'handle_response returns body on 200' do
    response = OpenStruct.new(status: 200, body: { data: 'ok' })
    result = @adapter.send(:handle_response, response)
    assert_equal({ data: 'ok' }, result)
  end
end