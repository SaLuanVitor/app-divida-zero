require 'test_helper'

class FinancialProviders::ManualAdapterTest < ActiveSupport::TestCase
  setup do
    @adapter = FinancialProviders::Manual.new
    @user = users(:one)
    @connection = FinancialConnection.create!(
      user: @user,
      provider: :manual,
      provider_item_id: 'manual_123',
      provider_institution_id: 'manual_upload',
      metadata: { file_path: 'test/fixtures/files/sample.ofx', format: 'ofx' }
    )
  end

  test 'capabilities returns correct hash' do
    caps = @adapter.capabilities

    assert_not caps[:accounts]
    assert caps[:transactions]
    assert_not caps[:credit_cards]
    assert_not caps[:investments]
    assert_not caps[:automatic_sync]
    assert caps[:manual_sync]
  end

  test 'ping returns true' do
    assert @adapter.ping
  end

  test 'create_connection raises NotImplementedError' do
    assert_raises(NotImplementedError) do
      @adapter.create_connection(@user)
    end
  end

  test 'refresh_connection raises NotImplementedError' do
    assert_raises(NotImplementedError) do
      @adapter.refresh_connection(@connection)
    end
  end

  test 'disconnect_connection does not raise' do
    assert_nothing_raised do
      @adapter.disconnect_connection(@connection)
    end
  end

  test 'accounts returns empty array' do
    assert_empty @adapter.accounts(@connection)
  end

  test 'institutions returns empty array' do
    assert_empty @adapter.institutions
  end

  test 'transactions returns empty array when file not found' do
    connection = FinancialConnection.new(metadata: { file_path: '/nonexistent.ofx' })
    assert_empty @adapter.transactions(connection)
  end

  test 'transactions returns empty array when metadata missing' do
    connection = FinancialConnection.new(metadata: {})
    assert_empty @adapter.transactions(connection)
  end

  test 'transactions handles parser errors gracefully' do
    connection = FinancialConnection.new(
      metadata: { file_path: 'test/fixtures/files/invalid.ofx', format: 'ofx' }
    )
    assert_nothing_raised do
      result = @adapter.transactions(connection)
      assert_empty result
    end
  end
end