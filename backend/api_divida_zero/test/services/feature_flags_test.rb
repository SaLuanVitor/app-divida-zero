require 'test_helper'

class FeatureFlagsTest < ActiveSupport::TestCase
  setup do
    FeatureFlag.delete_all
    FeatureFlags.clear_cache
  end

  test 'enabled? returns false for non-existent flag' do
    assert_not FeatureFlags.enabled?('non_existent')
  end

  test 'enabled? returns true for enabled flag' do
    FeatureFlag.create!(key: 'test_flag', enabled: true)
    FeatureFlags.clear_cache

    assert FeatureFlags.enabled?('test_flag')
  end

  test 'enabled? returns false for disabled flag' do
    FeatureFlag.create!(key: 'test_flag', enabled: false)
    FeatureFlags.clear_cache

    assert_not FeatureFlags.enabled?('test_flag')
  end

  test 'disabled? returns true for disabled flag' do
    FeatureFlag.create!(key: 'test_flag', enabled: false)

    assert FeatureFlags.disabled?('test_flag')
  end

  test 'disabled? returns true for non-existent flag' do
    assert FeatureFlags.disabled?('non_existent')
  end

  test 'enable creates flag if not exists' do
    FeatureFlags.enable('new_flag', description: 'Test flag')

    flag = FeatureFlag.find_by(key: 'new_flag')
    assert flag
    assert flag.enabled
    assert_equal 'Test flag', flag.description
  end

  test 'enable updates existing disabled flag' do
    FeatureFlag.create!(key: 'existing_flag', enabled: false)

    FeatureFlags.enable('existing_flag')

    assert FeatureFlag.find_by(key: 'existing_flag').enabled
  end

  test 'disable disables existing flag' do
    FeatureFlag.create!(key: 'to_disable', enabled: true)

    FeatureFlags.disable('to_disable')

    assert_not FeatureFlag.find_by(key: 'to_disable').enabled
  end

  test 'disable does nothing for non-existent flag' do
    assert_not FeatureFlags.disable('non_existent')
  end

  test 'all_flags returns hash of all flags' do
    FeatureFlag.create!(key: 'flag1', enabled: true)
    FeatureFlag.create!(key: 'flag2', enabled: false)

    flags = FeatureFlags.all_flags

    assert_equal true, flags['flag1']
    assert_equal false, flags['flag2']
  end

  test 'clear_cache clears specific flag' do
    FeatureFlag.create!(key: 'cache_test', enabled: true)
    FeatureFlags.enabled?('cache_test') # populate cache

    FeatureFlags.clear_cache('cache_test')

    # Should not raise, just verify it runs
    assert_nothing_raised { FeatureFlags.enabled?('cache_test') }
  end

  test 'clear_cache clears all flags when no key' do
    FeatureFlag.create!(key: 'cache_test', enabled: true)
    FeatureFlags.all_flags # populate cache

    FeatureFlags.clear_cache

    assert_nothing_raised { FeatureFlags.all_flags }
  end

  test 'convenience methods work' do
    FeatureFlag.create!(key: 'open_finance', enabled: true)
    FeatureFlag.create!(key: 'bank_sync', enabled: false)

    assert FeatureFlags.open_finance?
    assert_not FeatureFlags.bank_sync?
  end

  test 'enabled_for_user returns true for admin' do
    user = users(:one)
    user.update!(role: 'admin')

    FeatureFlag.create!(key: 'admin_only', enabled: false)

    assert FeatureFlags.enabled_for_user?(user, 'admin_only')
  end

  test 'enabled_for_user returns false for disabled flag for regular user' do
    user = users(:one)
    user.update!(role: 'user')

    FeatureFlag.create!(key: 'disabled_flag', enabled: false)

    assert_not FeatureFlags.enabled_for_user?(user, 'disabled_flag')
  end
end