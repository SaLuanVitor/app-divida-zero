require 'test_helper'

class PlanTest < ActiveSupport::TestCase
  test 'should be valid with name' do
    plan = Plan.new(name: 'premium', active: true, description: 'Plano premium')
    assert plan.valid?
  end

  test 'should require name' do
    plan = Plan.new(active: true)
    assert_not plan.valid?
    assert_includes plan.errors[:name], "can't be blank"
  end

  test 'should require unique name' do
    Plan.create!(name: 'free', active: true)
    plan = Plan.new(name: 'free', active: true)
    assert_not plan.valid?
    assert_includes plan.errors[:name], 'has already been taken'
  end

  test 'should have default active true' do
    plan = Plan.new(name: 'test')
    assert plan.active
  end

  test 'free class method creates or finds free plan' do
    plan = Plan.free
    assert_equal 'free', plan.name
    assert plan.active
    assert_equal 'Plano gratuito com limites conservadores', plan.description
  end

  test 'free class method returns existing free plan' do
    existing = Plan.create!(name: 'free', active: true, description: 'Custom')
    plan = Plan.free
    assert_equal existing.id, plan.id
    assert_equal 'Custom', plan.description
  end

  test 'limit_for returns value for key' do
    plan = Plan.create!(name: 'test', active: true)
    PlanLimit.create!(plan: plan, key: 'connections.max_total', value: 100)
    assert_equal 100, plan.limit_for('connections.max_total')
  end

  test 'limit_for returns nil for missing key' do
    plan = Plan.create!(name: 'test', active: true)
    assert_nil plan.limit_for('missing.key')
  end

  test 'limits_hash returns all limits as hash' do
    plan = Plan.create!(name: 'test', active: true)
    PlanLimit.create!(plan: plan, key: 'connections.max_total', value: 100)
    PlanLimit.create!(plan: plan, key: 'connections.max_per_user', value: 10)
    assert_equal({ 'connections.max_total' => 100, 'connections.max_per_user' => 10 }, plan.limits_hash)
  end

  test 'active scope returns only active plans' do
    Plan.create!(name: 'active_plan', active: true)
    Plan.create!(name: 'inactive_plan', active: false)
    assert_equal 1, Plan.active.count
    assert_equal 'active_plan', Plan.active.first.name
  end
end