class AddFinancialConnectionToImportedTransactions < ActiveRecord::Migration[8.1]
  def change
    add_reference :imported_transactions, :financial_connection, null: true, foreign_key: true
    add_index :imported_transactions, [:financial_connection_id, :fit_id],
              name: 'idx_imported_transactions_connection_fit_id'
  end
end
