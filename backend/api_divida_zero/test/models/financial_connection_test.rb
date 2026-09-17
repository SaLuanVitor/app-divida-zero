require 'test_helper'

class FinancialConnectionTest < ActiveSupport::TestCase
  setup do
    @user = users(:one)
  end

  test 'should be valid with required attributes' do
    connection = FinancialConnection.new(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'item_123',
      provider_institution_id: 'nubank',
      status: :pending
    )
    assert connection.valid?
  end

  test 'should require user' do
    connection = FinancialConnection.new(
      provider: :pluggy,
      provider_item_id: 'item_123',
      provider_institution_id: 'nubank'
    )
    assert_not connection.valid?
    assert_includes connection.errors[:user], 'must exist'
  end

  test 'should require provider' do
    connection = FinancialConnection.new(
      user: @user,
      provider_item_id: 'item_123',
      provider_institution_id: 'nubank'
    )
    assert_not connection.valid?
    assert_includes connection.errors[:provider], "can't be blank"
  end

  test 'should require provider_item_id' do
    connection = FinancialConnection.new(
      user: @user,
      provider: :pluggy,
      provider_institution_id: 'nubank'
    )
    assert_not connection.valid?
    assert_includes connection.errors[:provider_item_id], "can't be blank"
  end

  test 'should require provider_institution_id' do
    connection = FinancialConnection.new(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'item_123'
    )
    assert_not connection.valid?
    assert_includes connection.errors[:provider_institution_id], "can't be blank"
  end

  test 'should enforce unique provider_item_id per user per provider' do
    FinancialConnection.create!(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'item_123',
      provider_institution_id: 'nubank'
    )

    duplicate = FinancialConnection.new(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'item_123',
      provider_institution_id: 'itau'
    )
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:provider_item_id], 'has already been taken'
  end

  test 'should allow same provider_item_id for different users' do
    other_user = users(:two)
    FinancialConnection.create!(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'item_123',
      provider_institution_id: 'nubank'
    )

    connection = FinancialConnection.new(
      user: other_user,
      provider: :pluggy,
      provider_item_id: 'item_123',
      provider_institution_id: 'nubank'
    )
    assert connection.valid?
  end

  test 'should have default status pending' do
    connection = FinancialConnection.new(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'item_123',
      provider_institution_id: 'nubank'
    )
    assert_equal 'pending', connection.status
  end

  test 'active scope returns only active connections' do
    active_conn = FinancialConnection.create!(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'active_item',
      provider_institution_id: 'nubank',
      status: :active
    )
    FinancialConnection.create!(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'pending_item',
      provider_institution_id: 'itau',
      status: :pending
    )

    assert_includes FinancialConnection.active, active_conn
    assert_equal 1, FinancialConnection.active.count
  end

  test 'by_provider scope filters by provider' do
    FinancialConnection.create!(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'pluggy_item',
      provider_institution_id: 'nubank'
    )
    FinancialConnection.create!(
      user: @user,
      provider: :manual,
      provider_item_id: 'manual_item',
      provider_institution_id: 'manual_upload'
    )

    assert_equal 1, FinancialConnection.by_provider(:pluggy).count
    assert_equal 1, FinancialConnection.by_provider(:manual).count
  end

  test 'pluggy? returns true for pluggy provider' do
    connection = FinancialConnection.new(provider: :pluggy)
    assert connection.pluggy?
    assert_not connection.manual?
  end

  test 'manual? returns true for manual provider' do
    connection = FinancialConnection.new(provider: :manual)
    assert connection.manual?
    assert_not connection.pluggy?
  end

  test 'active? returns true for active status' do
    connection = FinancialConnection.new(status: :active)
    assert connection.active?

    connection.status = :pending
    assert_not connection.active?
  end
end