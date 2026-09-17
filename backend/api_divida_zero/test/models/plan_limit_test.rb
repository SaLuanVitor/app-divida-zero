require 'test_helper'

class PlanLimitTest < ActiveSupport::TestCase
  setup do
    @plan = Plan.create!(name: 'test', active: true)
  end

  test 'should be valid with plan, key, value' do
    limit = PlanLimit.new(plan: @plan, key: 'connections.max_total', value: 50)
    assert limit.valid?
  end

  test 'should require plan' do
    limit = PlanLimit.new(key: 'connections.max_total', value: 50)
    assert_not limit.valid?
    assert_includes limit.errors[:plan], 'must exist'
  end

  test 'should require key' do
    limit = PlanLimit.new(plan: @plan, value: 50)
    assert_not limit.valid?
    assert_includes limit.errors[:key], "can't be blank"
  end

  test 'should require value' do
    limit = PlanLimit.new(plan: @plan, key: 'connections.max_total')
    assert_not limit.valid?
    assert_includes limit.errors[:value], "can't be blank"
  end

  test 'should require value to be integer >= 0' do
    limit = PlanLimit.new(plan: @plan, key: 'test', value: -1)
    assert_not limit.valid?
    assert_includes limit.errors[:value], 'must be greater than or equal to 0'

    limit.value = 0
    assert limit.valid?

    limit.value = 'abc'
    assert_not limit.valid?
  end

  test 'should enforce unique key per plan' do
    PlanLimit.create!(plan: @plan, key: 'connections.max_total', value: 10)
    duplicate = PlanLimit.new(plan: @plan, key: 'connections.max_total', value: 20)
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:key], 'has already been taken'
  end

  test 'should allow same key for different plans' do
    other_plan = Plan.create!(name: 'other', active: true)
    PlanLimit.create!(plan: @plan, key: 'connections.max_total', value: 10)
    limit = PlanLimit.new(plan: other_plan, key: 'connections.max_total', value: 20)
    assert limit.valid?
  end

  test 'for_key scope filters by key' do
    PlanLimit.create!(plan: @plan, key: 'connections.max_total', value: 10)
    PlanLimit.create!(plan: @plan, key: 'accounts.max_per_user', value: 5)
    assert_equal 1, PlanLimit.for_key('connections.max_total').count
  end

  test 'class method connections_max_total returns default when not set' do
    assert_equal 20, PlanLimit.connections_max_total
  end

  test 'class method connections_max_total returns configured value' do
    Plan.create!(name: 'free', active: true) unless Plan.exists?(name: 'free')
    free_plan = Plan.free
    PlanLimit.create!(plan: free_plan, key: 'connections.max_total', value: 50)
    assert_equal 50, PlanLimit.connections_max_total
  end

  test 'class method connections_max_per_user returns default' do
    assert_equal 3, PlanLimit.connections_max_per_user
  end

  test 'class method accounts_max_per_user returns default' do
    assert_equal 15, PlanLimit.accounts_max_per_user
  end

  test 'class method transactions_max_per_month returns default' do
    assert_equal 10000, PlanLimit.transactions_max_per_month
  end

  test 'class method sync_manual_per_day returns default' do
    assert_equal 2, PlanLimit.sync_manual_per_day
  end

  test 'class method users_max returns default' do
    assert_equal 10, PlanLimit.users_max
  end
end