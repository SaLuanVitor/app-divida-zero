require 'test_helper'

class LimitsServiceTest < ActiveSupport::TestCase
  setup do
    Rails.cache.clear
    @user = users(:one)
    @free_plan = Plan.seed_free_plan!
    @user.update!(plan: @free_plan)
    FeatureFlags.enable('open_finance')

    LimitsService.clear_cache(@user)
  end

  test 'allowed? returns true when under limit' do
    # User has 0 connections, limit is 3
    assert LimitsService.allowed?(@user, :connections, :create)
  end

  test 'allowed? returns false when at limit' do
    3.times do |i|
      FinancialConnection.create!(
        user: @user,
        provider: :pluggy,
        provider_item_id: "item_#{i}",
        provider_institution_id: 'nubank',
        status: :active
      )
    end

    assert_not LimitsService.allowed?(@user, :connections, :create)
  end

  test 'remaining returns correct count' do
    FinancialConnection.create!(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'item_1',
      provider_institution_id: 'nubank',
      status: :active
    )

    assert_equal 2, LimitsService.remaining(@user, :connections)
  end

  test 'remaining returns infinity when limit is 0' do
    @free_plan.plan_limits.find_by(key: 'connections.max_per_user').update!(value: 0)

    assert_equal Float::INFINITY, LimitsService.remaining(@user, :connections)
  end

  test 'exceeded? returns true when at limit' do
    3.times do |i|
      FinancialConnection.create!(
        user: @user,
        provider: :pluggy,
        provider_item_id: "item_#{i}",
        provider_institution_id: 'nubank',
        status: :active
      )
    end

    assert LimitsService.exceeded?(@user, :connections)
  end

  test 'usage returns hash with all resources' do
    FinancialConnection.create!(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'item_1',
      provider_institution_id: 'nubank',
      status: :active
    )

    usage = LimitsService.usage(@user)

    assert_equal 1, usage[:connections]
    assert usage.key?(:accounts)
    assert usage.key?(:transactions_this_month)
    assert usage.key?(:syncs)
  end

  test 'percentage_used returns correct percentage' do
    FinancialConnection.create!(
      user: @user,
      provider: :pluggy,
      provider_item_id: 'item_1',
      provider_institution_id: 'nubank',
      status: :active
    )

    assert_equal 33, LimitsService.percentage_used(@user, :connections) # 1/3 = 33%
  end

  test 'status returns correct status' do
    # 0% - normal
    assert_equal :normal, LimitsService.status(@user, :connections)

    # 33% - normal
    FinancialConnection.create!(user: @user, provider: :pluggy, provider_item_id: 'item_1', provider_institution_id: 'nubank', status: :active)
    LimitsService.clear_cache(@user)
    assert_equal :normal, LimitsService.status(@user, :connections)

    # 66% - normal
    FinancialConnection.create!(user: @user, provider: :pluggy, provider_item_id: 'item_2', provider_institution_id: 'itau', status: :active)
    LimitsService.clear_cache(@user)
    assert_equal :normal, LimitsService.status(@user, :connections)

    # 100% - blocked
    FinancialConnection.create!(user: @user, provider: :pluggy, provider_item_id: 'item_3', provider_institution_id: 'bb', status: :active)
    LimitsService.clear_cache(@user)
    assert_equal :blocked, LimitsService.status(@user, :connections)
  end

  test 'clear_cache removes cached usage' do
    LimitsService.usage(@user) # populate cache
    LimitsService.clear_cache(@user)

    # Should not raise, just verify it runs
    assert_nothing_raised { LimitsService.usage(@user) }
  end

  test 'returns true when open_finance disabled' do
    FeatureFlags.disable('open_finance')

    assert LimitsService.allowed?(@user, :connections, :create)
    assert_equal Float::INFINITY, LimitsService.remaining(@user, :connections)
    assert_equal 0, LimitsService.percentage_used(@user, :connections)
  end

  test 'build_limit_key generates correct keys' do
    assert_equal 'connections.max_per_user', LimitsService.send(:build_limit_key, :connections, :create)
    assert_equal 'connections.max_total', LimitsService.send(:build_limit_key, :connections, :read)
  end
end