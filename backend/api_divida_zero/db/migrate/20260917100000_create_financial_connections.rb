class CreateFinancialConnections < ActiveRecord::Migration[8.1]
  def change
    create_table :financial_connections do |t|
      t.references :user, null: false, foreign_key: true
      t.string :provider, null: false
      t.string :provider_item_id, null: false
      t.string :provider_institution_id, null: false
      t.integer :status, null: false, default: 0
      t.datetime :last_synced_at
      t.text :last_sync_error
      t.text :metadata
      t.timestamps
    end
    add_index :financial_connections, [:user_id, :provider, :provider_item_id], unique: true, name: 'idx_financial_connections_unique'
    add_index :financial_connections, :status
    add_index :financial_connections, :last_synced_at
  end
end