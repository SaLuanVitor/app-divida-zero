class Plan < ApplicationRecord
  has_many :plan_limits, dependent: :destroy
  has_many :users, dependent: :nullify

  validates :name, presence: true, uniqueness: true
  validates :active, inclusion: { in: [true, false] }

  scope :active, -> { where(active: true) }

  def self.free
    find_or_create_by!(name: 'free') do |plan|
      plan.active = true
      plan.description = 'Plano gratuito com limites conservadores'
    end
  end

  def self.seed_free_plan!
    free_plan = free

    free_plan.plan_limits.find_or_create_by!(key: 'connections.max_total') do |limit|
      limit.value = 20
      limit.description = 'Total de conexões no sistema'
    end

    free_plan.plan_limits.find_or_create_by!(key: 'connections.max_per_user') do |limit|
      limit.value = 3
      limit.description = 'Conexões por usuário'
    end

    free_plan.plan_limits.find_or_create_by!(key: 'accounts.max_per_user') do |limit|
      limit.value = 15
      limit.description = 'Contas por usuário'
    end

    free_plan.plan_limits.find_or_create_by!(key: 'transactions.max_per_month') do |limit|
      limit.value = 10000
      limit.description = 'Transações processadas por mês'
    end

    free_plan.plan_limits.find_or_create_by!(key: 'sync.manual_per_day') do |limit|
      limit.value = 2
      limit.description = 'Sincronizações manuais por dia'
    end

    free_plan.plan_limits.find_or_create_by!(key: 'users.max') do |limit|
      limit.value = 10
      limit.description = 'Usuários totais no plano free'
    end

    free_plan
  end

  def limit_for(key)
    plan_limits.find_by(key: key)&.value
  end

  def limits_hash
    plan_limits.pluck(:key, :value).to_h
  end
end