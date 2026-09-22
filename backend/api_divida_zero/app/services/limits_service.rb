class LimitsService
  CACHE_TTL = 5.minutes

  def self.allowed?(user, resource, action)
    return true unless FeatureFlags.enabled?(:open_finance)

    plan = user.plan || Plan.free
    limit_key = build_limit_key(resource, action)
    limit = plan.limits.find_by(key: limit_key)&.value.to_i

    return true if limit.zero? # 0 = unlimited

    current = usage(user)[resource] || 0
    current < limit
  end

  def self.remaining(user, resource)
    return Float::INFINITY unless FeatureFlags.enabled?(:open_finance)

    plan = user.plan || Plan.free
    limit_key = build_limit_key(resource, :create)
    limit = plan.limits.find_by(key: limit_key)&.value.to_i

    return Float::INFINITY if limit.zero?

    current = usage(user)[resource] || 0
    [limit - current, 0].max
  end

  def self.exceeded?(user, resource)
    !allowed?(user, resource, :create)
  end

  def self.usage(user)
    Rails.cache.fetch("limits_usage/#{user.id}", expires_in: CACHE_TTL) do
      {
        connections: user.financial_connections.active.count,
        accounts: user.financial_accounts.count,
        transactions_this_month: user.financial_records.where('due_date >= ?', Time.current.beginning_of_month).count,
        syncs_today: user.financial_syncs.where('started_at >= ?', Time.current.beginning_of_day).count
      }
    end
  end

  def self.percentage_used(user, resource)
    return 0 unless FeatureFlags.enabled?(:open_finance)

    plan = user.plan || Plan.free
    limit_key = build_limit_key(resource, :create)
    limit = plan.limits.find_by(key: limit_key)&.value.to_i

    return 0 if limit.zero?

    current = usage(user)[resource] || 0
    ((current.to_f / limit) * 100).round
  end

  def self.status(user, resource)
    pct = percentage_used(user, resource)
    case pct
    when 0..69 then :normal
    when 70..79 then :caution
    when 80..99 then :warning
    else :blocked
    end
  end

  def self.clear_cache(user)
    Rails.cache.delete("limits_usage/#{user.id}")
  end

  def self.build_limit_key(resource, action)
    suffix = action == :create ? 'per_user' : 'total'
    "#{resource}.max_#{suffix}"
  end
end