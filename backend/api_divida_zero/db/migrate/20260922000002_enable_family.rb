class EnableFamily < ActiveRecord::Migration[8.1]
  def up
    # Fase 2 (família) já está implementada; liga o flag que estava false e sem uso.
    FeatureFlag.where(key: 'family').update_all(enabled: true)
  end

  def down
    FeatureFlag.where(key: 'family').update_all(enabled: false)
  end
end
