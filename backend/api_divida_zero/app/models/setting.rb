class Setting < ApplicationRecord
  validates :key, presence: true, uniqueness: true

  def self.get(key, default: nil)
    find_by(key: key)&.value || ENV[key.upcase] || default
  end

  def self.set(key, value, description: nil)
    find_or_create_by(key: key) do |setting|
      setting.value = value
      setting.description = description
    end.update(value: value)
  end

  def self.delete(key)
    where(key: key).delete_all
  end

  def self.pluggy_client_id
    get('pluggy.client_id', default: ENV['PLUGGY_CLIENT_ID'])
  end

  def self.pluggy_client_secret
    get('pluggy.client_secret', default: ENV['PLUGGY_CLIENT_SECRET'])
  end

  def self.pluggy_base_url
    get('pluggy.base_url', default: ENV['PLUGGY_BASE_URL'] || 'https://api.pluggy.ai')
  end

  def self.pluggy_connect_url
    get('pluggy.connect_url', default: ENV['PLUGGY_CONNECT_URL'] || 'https://connect.pluggy.ai')
  end

  def self.pluggy_webhook_secret
    get('pluggy.webhook_secret', default: ENV['PLUGGY_WEBHOOK_SECRET'])
  end

  def self.open_finance_provider
    get('open_finance.provider', default: ENV['OPEN_FINANCE_PROVIDER'] || 'pluggy')
  end
end