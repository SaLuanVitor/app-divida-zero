class CreateFinancialSyncs < ActiveRecord::Migration[8.1]
  def change
    create_table :financial_syncs do |t|
      t.references :financial_connection, null: false, foreign_key: true
      t.string :provider, null: false
      t.integer :sync_type, null: false, default: 0
      t.integer :status, null: false, default: 0
      t.datetime :started_at
      t.datetime :finished_at
      t.integer :records_created, default: 0
      t.integer :records_updated, default: 0
      t.integer :records_deleted, default: 0
      t.string :error_code
      t.text :error_message
      t.timestamps
    end
    add_index :financial_syncs, :status
    add_index :financial_syncs, :started_at
  end
end