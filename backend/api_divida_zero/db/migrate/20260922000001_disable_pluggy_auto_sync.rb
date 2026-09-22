class DisablePluggyAutoSync < ActiveRecord::Migration[8.1]
  def up
    # ADR-0003: sync bancário congelado no manual OFX/CSV — auto-sync (Pluggy) fica off.
    FeatureFlag.where(key: %w[open_finance bank_sync]).update_all(enabled: false)
  end

  def down
    FeatureFlag.where(key: %w[open_finance bank_sync]).update_all(enabled: true)
  end
end
