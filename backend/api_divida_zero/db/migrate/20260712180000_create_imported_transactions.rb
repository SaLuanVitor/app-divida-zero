class CreateImportedTransactions < ActiveRecord::Migration[8.0]
  def change
    create_table :imported_transactions do |t|
      t.references :user, null: false, foreign_key: true
      t.string :import_batch_id, null: false
      t.string :source, null: false
      t.string :source_filename
      t.string :description, null: false
      t.decimal :amount, precision: 12, scale: 2, null: false
      t.date :date, null: false
      t.string :flow_type
      t.string :original_category
      t.string :suggested_category
      t.decimal :ai_confidence, precision: 4, scale: 3
      t.string :status, default: "pending"
      t.string :duplicate_reason
      t.references :duplicate_of, foreign_key: { to_table: :financial_records }
      t.references :financial_record, foreign_key: true
      t.jsonb :original_data, default: {}
      t.string :fit_id
      t.string :check_number
      t.timestamps
    end

    add_index :imported_transactions, :import_batch_id
    add_index :imported_transactions, [:user_id, :status]
    add_index :imported_transactions, [:user_id, :date]
    add_index :imported_transactions, [:amount, :date, :description], name: "idx_imported_dedup"
    add_index :imported_transactions, [:user_id, :fit_id], unique: true, where: "fit_id IS NOT NULL",
              name: "idx_imported_fit_id"
  end
end
