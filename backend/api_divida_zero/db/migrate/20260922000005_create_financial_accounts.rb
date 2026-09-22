class CreateFinancialAccounts < ActiveRecord::Migration[8.1]
  def change
    create_table :financial_accounts do |t|
      t.references :financial_connection, null: false, foreign_key: true
      t.string :provider_account_id, null: false
      t.string :name, null: false
      t.integer :account_type, null: false, default: 0
      t.decimal :balance, precision: 12, scale: 2, default: 0.0, null: false
      t.string :currency, null: false, default: 'BRL'
      t.timestamps
    end

    add_index :financial_accounts, [:financial_connection_id, :provider_account_id],
              unique: true, name: 'idx_financial_accounts_connection_provider'
  end
end
