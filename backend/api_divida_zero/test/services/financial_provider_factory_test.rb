require 'test_helper'

class FinancialProviderFactoryTest < ActiveSupport::TestCase
  setup do
    FinancialProviders::Factory.clear_registry!
  end

  teardown do
    FinancialProviders::Factory.clear_registry!
  end

  test 'build returns Pluggy adapter by default' do
    adapter = FinancialProviders::Factory.build

    assert_instance_of FinancialProviders::Pluggy, adapter
  end

  test 'build returns Pluggy adapter when specified' do
    adapter = FinancialProviders::Factory.build('pluggy')

    assert_instance_of FinancialProviders::Pluggy, adapter
  end

  test 'build returns Manual adapter when specified' do
    adapter = FinancialProviders::Factory.build('manual')

    assert_instance_of FinancialProviders::Manual, adapter
  end

  test 'build passes config to adapter' do
    adapter = FinancialProviders::Factory.build('pluggy', client_id: 'custom_id', client_secret: 'custom_secret')

    assert_equal 'custom_id', adapter.instance_variable_get(:@client_id)
    assert_equal 'custom_secret', adapter.instance_variable_get(:@client_secret)
  end

  test 'build raises error for unknown provider' do
    assert_raises(ArgumentError) do
      FinancialProviders::Factory.build('unknown_provider')
    end
  end

  test 'available_providers returns known providers' do
    providers = FinancialProviders::Factory.available_providers

    assert_includes providers, 'pluggy'
    assert_includes providers, 'manual'
  end

  test 'register adds new provider' do
    custom_class = Class.new(FinancialProviders::Base)

    FinancialProviders::Factory.register('custom', custom_class)

    adapter = FinancialProviders::Factory.build('custom')
    assert_instance_of custom_class, adapter
  end

  test 'unregister removes provider' do
    FinancialProviders::Factory.unregister('manual')

    assert_raises(ArgumentError) do
      FinancialProviders::Factory.build('manual')
    end
    assert_not_includes FinancialProviders::Factory.available_providers, 'manual'
  end

  test 'clear_registry! restores default providers' do
    FinancialProviders::Factory.register('custom', Class.new(FinancialProviders::Base))
    FinancialProviders::Factory.unregister('pluggy')

    FinancialProviders::Factory.clear_registry!

    assert_includes FinancialProviders::Factory.available_providers, 'pluggy'
    assert_includes FinancialProviders::Factory.available_providers, 'manual'
    assert_not_includes FinancialProviders::Factory.available_providers, 'custom'
  end

  test 'registry is thread-safe (Concurrent::Hash)' do
    assert_kind_of Concurrent::Hash, FinancialProviders::Factory::PROVIDERS
  end
end