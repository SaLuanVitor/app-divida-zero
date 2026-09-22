class FinancialConnection < ApplicationRecord
  belongs_to :user
  has_many :financial_syncs, dependent: :destroy
  has_many :financial_accounts, dependent: :destroy
  has_many :imported_transactions, dependent: :destroy

  enum :status, {
    pending: 0,
    active: 1,
    error: 2,
    disconnected: 3,
    action_required: 4
  }, default: :pending

  enum :provider, {
    pluggy: 'pluggy',
    manual: 'manual'
  }

  validates :provider, presence: true
  validates :provider_item_id, presence: true
  validates :provider_institution_id, presence: true
  validates :status, presence: true

  scope :active, -> { where(status: :active) }
  scope :by_provider, ->(provider) { where(provider: provider) }
  scope :recently_synced, -> { where('last_synced_at > ?', 24.hours.ago) }
  scope :with_errors, -> { where(status: :error) }

  def active?
    status == 'active'
  end

  def manual?
    provider == 'manual'
  end

  def pluggy?
    provider == 'pluggy'
  end
end