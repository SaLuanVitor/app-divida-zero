require 'concurrent/hash'

module FinancialProviders
  class Factory
    PROVIDERS = Concurrent::Hash.new
    PROVIDERS['pluggy'] = FinancialProviders::Pluggy
    PROVIDERS['manual'] = FinancialProviders::Manual

    def self.build(provider = nil, config = {})
      provider ||= Setting.open_finance_provider
      klass = PROVIDERS[provider.to_s]

      raise ArgumentError, "Unknown provider: #{provider}. Available: #{PROVIDERS.keys.join(', ')}" unless klass

      klass.new(config)
    end

    def self.available_providers
      PROVIDERS.keys
    end

    def self.register(name, klass)
      PROVIDERS[name.to_s] = klass
    end

    def self.unregister(name)
      PROVIDERS.delete(name.to_s)
    end

    def self.clear_registry!
      PROVIDERS.clear
      PROVIDERS.merge!({
        'pluggy' => FinancialProviders::Pluggy,
        'manual' => FinancialProviders::Manual
      }.freeze)
    end
  end
end