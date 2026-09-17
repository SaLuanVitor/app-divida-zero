require 'test_helper'

class FinancialAccountTest < ActiveSupport::TestCase
  setup do
    @user = users(:one)
    @connection = FinancialConnection.create!(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'item_123',
      provider_institution_id: 'nubank'
    )
  end

  test 'should be valid with required attributes' do
    account = FinancialAccount.new(
      financial_connection: @connection,
      provider_account_id: 'acc_123',
      name: 'Conta Corrente',
      account_type: :checking,
      balance: 1000.00,
      currency: 'BRL'
    )
    assert account.valid?
  end

  test 'should require financial_connection' do
    account = FinancialAccount.new(
      provider_account_id: 'acc_123',
      name: 'Conta Corrente',
      account_type: :checking,
      balance: 1000.00,
      currency: 'BRL'
    )
    assert_not account.valid?
    assert_includes account.errors[:financial_connection], 'must exist'
  end

  test 'should require provider_account_id' do
    account = FinancialAccount.new(
      financial_connection: @connection,
      name: 'Conta Corrente',
      account_type: :checking,
      balance: 1000.00,
      currency: 'BRL'
    )
    assert_not account.valid?
    assert_includes account.errors[:provider_account_id], "can't be blank"
  end

  test 'should require name' do
    account = FinancialAccount.new(
      financial_connection: @connection,
      provider_account_id: 'acc_123',
      account_type: :checking,
      balance: 1000.00,
      currency: 'BRL'
    )
    assert_not account.valid?
    assert_includes account.errors[:name], "can't be blank"
  end

  test 'should require account_type' do
    account = FinancialAccount.new(
      financial_connection: @connection,
      provider_account_id: 'acc_123',
      name: 'Conta Corrente',
      balance: 1000.00,
      currency: 'BRL'
    )
    assert_not account.valid?
    assert_includes account.errors[:account_type], "can't be blank"
  end

  test 'should require currency' do
    account = FinancialAccount.new(
      financial_connection: @connection,
      provider_account_id: 'acc_123',
      name: 'Conta Corrente',
      account_type: :checking,
      balance: 1000.00
    )
    assert_not account.valid?
    assert_includes account.errors[:currency], "can't be blank"
  end

  test 'checking_accounts scope returns only checking accounts' do
    checking = FinancialAccount.create!(
      financial_connection: @connection,
      provider_account_id: 'checking_1',
      name: 'Conta Corrente',
      account_type: :checking,
      balance: 1000.00,
      currency: 'BRL'
    )
    FinancialAccount.create!(
      financial_connection: @connection,
      provider_account_id: 'savings_1',
      name: 'Poupança',
      account_type: :savings,
      balance: 5000.00,
      currency: 'BRL'
    )
    assert_includes FinancialAccount.checking_accounts, checking
    assert_equal 1, FinancialAccount.checking_accounts.count
  end

  test 'credit_cards scope returns only credit cards' do
    credit_card = FinancialAccount.create!(
      financial_connection: @connection,
      provider_account_id: 'card_1',
      name: 'Nubank',
      account_type: :credit_card,
      balance: -500.00,
      currency: 'BRL'
    )
    assert_includes FinancialAccount.credit_cards, credit_card
    assert_equal 1, FinancialAccount.credit_cards.count
  end

  test 'investments scope returns only investments' do
    investment = FinancialAccount.create!(
      financial_connection: @connection,
      provider_account_id: 'inv_1',
      name: 'Investimentos',
      account_type: :investment,
      balance: 10000.00,
      currency: 'BRL'
    )
    assert_includes FinancialAccount.investments, investment
    assert_equal 1, FinancialAccount.investments.count
  end

  test 'credit_card? returns true for credit_card type' do
    account = FinancialAccount.new(account_type: :credit_card)
    assert account.credit_card?

    account.account_type = :checking
    assert_not account.credit_card?
  end

  test 'balance_in_cents converts balance to cents' do
    account = FinancialAccount.new(balance: 1234.56)
    assert_equal 123456, account.balance_in_cents

    account.balance = 1000.00
    assert_equal 100000, account.balance_in_cents

    account.balance = 0.01
    assert_equal 1, account.balance_in_cents
  end
end