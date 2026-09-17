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

  def limit_for(key)
    plan_limits.find_by(key: key)&.value
  end

  def limits_hash
    plan_limits.pluck(:key, :value).to_h
  end
end