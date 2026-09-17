require 'test_helper'

class SettingTest < ActiveSupport::TestCase
  test 'should be valid with key' do
    setting = Setting.new(key: 'test_key', value: 'test_value')
    assert setting.valid?
  end

  test 'should require key' do
    setting = Setting.new(value: 'test_value')
    assert_not setting.valid?
    assert_includes setting.errors[:key], "can't be blank"
  end

  test 'should require unique key' do
    Setting.create!(key: 'duplicate', value: 'value1')
    setting = Setting.new(key: 'duplicate', value: 'value2')
    assert_not setting.valid?
    assert_includes setting.errors[:key], 'has already been taken'
  end

  test 'get returns value for existing key' do
    Setting.create!(key: 'existing_key', value: 'stored_value')
    assert_equal 'stored_value', Setting.get('existing_key')
  end

  test 'get returns default for non-existent key' do
    assert_equal 'default_value', Setting.get('non_existent', default: 'default_value')
  end

  test 'get falls back to ENV when not in database' do
    ENV['TEST_SETTING'] = 'env_value'
    assert_equal 'env_value', Setting.get('test_setting', default: 'default')
    ENV.delete('TEST_SETTING')
  end

  test 'get prioritizes database over ENV' do
    Setting.create!(key: 'priority_test', value: 'db_value')
    ENV['PRIORITY_TEST'] = 'env_value'
    assert_equal 'db_value', Setting.get('priority_test')
    ENV.delete('PRIORITY_TEST')
  end

  test 'set creates new setting' do
    Setting.set('new_key', 'new_value', description: 'Test setting')
    setting = Setting.find_by(key: 'new_key')
    assert_equal 'new_value', setting.value
    assert_equal 'Test setting', setting.description
  end

  test 'set updates existing setting' do
    Setting.create!(key: 'update_key', value: 'old_value')
    Setting.set('update_key', 'new_value')
    assert_equal 'new_value', Setting.get('update_key')
  end

  test 'delete removes setting' do
    Setting.create!(key: 'to_delete', value: 'value')
    Setting.delete('to_delete')
    assert_not Setting.exists?(key: 'to_delete')
  end

  test 'pluggy_client_id returns Setting value' do
    Setting.create!(key: 'pluggy.client_id', value: 'setting_client_id')
    assert_equal 'setting_client_id', Setting.pluggy_client_id
  end

  test 'pluggy_client_id falls back to ENV' do
    ENV['PLUGGY_CLIENT_ID'] = 'env_client_id'
    assert_equal 'env_client_id', Setting.pluggy_client_id
    ENV.delete('PLUGGY_CLIENT_ID')
  end

  test 'pluggy_client_secret returns Setting value' do
    Setting.create!(key: 'pluggy.client_secret', value: 'setting_secret')
    assert_equal 'setting_secret', Setting.pluggy_client_secret
  end

  test 'pluggy_base_url returns default when not configured' do
    assert_equal 'https://api.pluggy.ai', Setting.pluggy_base_url
  end

  test 'pluggy_base_url returns configured value' do
    Setting.create!(key: 'pluggy.base_url', value: 'https://custom.api.pluggy.ai')
    assert_equal 'https://custom.api.pluggy.ai', Setting.pluggy_base_url
  end

  test 'pluggy_connect_url returns default when not configured' do
    assert_equal 'https://connect.pluggy.ai', Setting.pluggy_connect_url
  end

  test 'pluggy_webhook_secret returns Setting value' do
    Setting.create!(key: 'pluggy.webhook_secret', value: 'webhook_secret')
    assert_equal 'webhook_secret', Setting.pluggy_webhook_secret
  end

  test 'open_finance_provider returns pluggy by default' do
    assert_equal 'pluggy', Setting.open_finance_provider
  end

  test 'open_finance_provider returns configured value' do
    Setting.create!(key: 'open_finance.provider', value: 'belvo')
    assert_equal 'belvo', Setting.open_finance_provider
  end

  test 'open_finance_provider falls back to ENV' do
    ENV['OPEN_FINANCE_PROVIDER'] = 'manual'
    assert_equal 'manual', Setting.open_finance_provider
    ENV.delete('OPEN_FINANCE_PROVIDER')
  end
end