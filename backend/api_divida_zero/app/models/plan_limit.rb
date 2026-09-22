class PlanLimit < ApplicationRecord
  belongs_to :plan

  validates :key, presence: true, uniqueness: { scope: :plan_id }
  validates :value, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :plan, presence: true

  scope :for_key, ->(key) { where(key: key) }

  def self.connections_max_total
    find_by(key: 'connections.max_total')&.value || 20
  end

  def self.connections_max_per_user
    find_by(key: 'connections.max_per_user')&.value || 3
  end

  def self.accounts_max_per_user
    find_by(key: 'accounts.max_per_user')&.value || 15
  end

  def self.transactions_max_per_month
    find_by(key: 'transactions.max_per_month')&.value || 10000
  end

  def self.sync_manual_per_day
    find_by(key: 'sync.manual_per_day')&.value || 2
  end

  def self.users_max
    find_by(key: 'users.max')&.value || 10
  end
end