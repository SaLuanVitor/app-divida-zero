class FinancialAccount < ApplicationRecord
  belongs_to :financial_connection

  enum :account_type, {
    checking: 0,
    savings: 1,
    credit_card: 2,
    investment: 3,
    loan: 4,
    other: 5
  }

  validates :provider_account_id, presence: true
  validates :name, presence: true
  validates :account_type, presence: true
  validates :currency, presence: true

  scope :checking_accounts, -> { where(account_type: :checking) }
  scope :credit_cards, -> { where(account_type: :credit_card) }
  scope :investments, -> { where(account_type: :investment) }

  def credit_card?
    account_type == 'credit_card'
  end

  def balance_in_cents
    (balance * 100).to_i
  end
end