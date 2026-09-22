class FeatureFlags
  CACHE_TTL = 5.minutes

  def self.enabled?(key)
    Rails.cache.fetch("feature_flag/#{key}", expires_in: CACHE_TTL) do
      flag = FeatureFlag.find_by(key: key)
      flag&.enabled || false
    end
  end

  def self.disabled?(key)
    !enabled?(key)
  end

  def self.enabled_for_user?(user, key)
    return false unless user
    return true if user.admin? # admins bypass feature flags

    enabled?(key)
  end

  def self.enable(key, description: nil)
    flag = FeatureFlag.find_or_initialize_by(key: key)
    flag.enabled = true
    flag.description = description if description.present?
    flag.save!
    clear_cache(key)
    flag
  end

  def self.disable(key)
    flag = FeatureFlag.find_by(key: key)
    return false unless flag

    flag.update!(enabled: false)
    clear_cache(key)
    true
  end

  def self.all_flags
    Rails.cache.fetch("feature_flags/all", expires_in: CACHE_TTL) do
      FeatureFlag.all.index_by(&:key).transform_values(&:enabled?)
    end
  end

  def self.clear_cache(key = nil)
    if key
      Rails.cache.delete("feature_flag/#{key}")
    else
      Rails.cache.delete("feature_flags/all")
    end
  end

  # Convenience methods for known flags
  def self.open_finance?
    enabled?(:open_finance)
  end

  def self.bank_sync?
    enabled?(:bank_sync)
  end

  def self.investments?
    enabled?(:investments)
  end

  def self.credit_cards?
    enabled?(:credit_cards)
  end

  def self.family?
    enabled?(:family)
  end

  def self.ai_analysis?
    enabled?(:ai_analysis)
  end

  def self.manual_import?
    enabled?(:manual_import)
  end
end