require 'test_helper'

class FeatureFlagTest < ActiveSupport::TestCase
  test 'should be valid with key' do
    flag = FeatureFlag.new(key: 'test_feature', enabled: true)
    assert flag.valid?
  end

  test 'should require key' do
    flag = FeatureFlag.new(enabled: true)
    assert_not flag.valid?
    assert_includes flag.errors[:key], "can't be blank"
  end

  test 'should require unique key' do
    FeatureFlag.create!(key: 'duplicate', enabled: true)
    flag = FeatureFlag.new(key: 'duplicate', enabled: false)
    assert_not flag.valid?
    assert_includes flag.errors[:key], 'has already been taken'
  end

  test 'enabled scope returns only enabled flags' do
    FeatureFlag.create!(key: 'enabled_flag', enabled: true)
    FeatureFlag.create!(key: 'disabled_flag', enabled: false)
    assert_equal 1, FeatureFlag.enabled.count
    assert_equal 'enabled_flag', FeatureFlag.enabled.first.key
  end

  test 'disabled scope returns only disabled flags' do
    FeatureFlag.create!(key: 'enabled_flag', enabled: true)
    FeatureFlag.create!(key: 'disabled_flag', enabled: false)
    assert_equal 1, FeatureFlag.disabled.count
    assert_equal 'disabled_flag', FeatureFlag.disabled.first.key
  end

  test 'enabled? returns true for enabled flag' do
    FeatureFlag.create!(key: 'test_enabled', enabled: true)
    assert FeatureFlag.enabled?('test_enabled')
  end

  test 'enabled? returns false for disabled flag' do
    FeatureFlag.create!(key: 'test_disabled', enabled: false)
    assert_not FeatureFlag.enabled?('test_disabled')
  end

  test 'enabled? returns false for non-existent flag' do
    assert_not FeatureFlag.enabled?('non_existent')
  end

  test 'disabled? returns true for disabled flag' do
    FeatureFlag.create!(key: 'test_disabled', enabled: false)
    assert FeatureFlag.disabled?('test_disabled')
  end

  test 'disabled? returns true for non-existent flag' do
    assert FeatureFlag.disabled?('non_existent')
  end

  test 'enable creates flag if not exists and enables it' do
    FeatureFlag.enable('new_feature', description: 'New feature description')
    flag = FeatureFlag.find_by(key: 'new_feature')
    assert flag.enabled
    assert_equal 'New feature description', flag.description
  end

  test 'enable enables existing disabled flag' do
    FeatureFlag.create!(key: 'existing', enabled: false, description: 'Old')
    FeatureFlag.enable('existing', description: 'New description')
    flag = FeatureFlag.find_by(key: 'existing')
    assert flag.enabled
    assert_equal 'New description', flag.description
  end

  test 'disable disables existing flag' do
    FeatureFlag.create!(key: 'to_disable', enabled: true)
    FeatureFlag.disable('to_disable')
    assert_not FeatureFlag.enabled?('to_disable')
  end

  test 'disable does nothing for non-existent flag' do
    assert_nothing_raised { FeatureFlag.disable('non_existent') }
  end

  test 'seed_initial! creates all initial flags' do
    FeatureFlag.delete_all
    FeatureFlag.seed_initial!
    
    FeatureFlag::INITIAL_FLAGS.each do |key, config|
      flag = FeatureFlag.find_by(key: key)
      assert flag, "Expected flag #{key} to exist"
      assert_equal config[:enabled], flag.enabled
      assert_equal config[:description], flag.description
    end
  end

  test 'seed_initial! is idempotent' do
    FeatureFlag.seed_initial!
    count_before = FeatureFlag.count
    FeatureFlag.seed_initial!
    assert_equal count_before, FeatureFlag.count
  end
end