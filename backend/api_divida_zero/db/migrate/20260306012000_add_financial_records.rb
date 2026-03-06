class AddFinancialRecords < ActiveRecord::Migration[8.1]
  def change
    create_table :financial_records do |t|
      t.references :user, null: false, foreign_key: true
      t.string :title, null: false
      t.text :description
      t.string :record_type, null: false # launch | debt
      t.string :flow_type, null: false # income | expense
      t.decimal :amount, precision: 12, scale: 2, null: false
      t.string :status, null: false, default: "pending" # pending | paid
      t.date :due_date, null: false
      t.datetime :paid_at

      t.boolean :recurring, null: false, default: false
      t.string :recurrence_type, null: false, default: "none" # none | weekly | monthly | yearly
      t.integer :recurrence_count, null: false, default: 1

      t.integer :installments_total, null: false, default: 1
      t.integer :installment_number, null: false, default: 1
      t.string :group_code

      t.string :category
      t.string :priority, null: false, default: "normal" # low | normal | high
      t.text :notes

      t.timestamps
    end

    add_index :financial_records, [:user_id, :due_date]
    add_index :financial_records, [:user_id, :status]
    add_index :financial_records, :group_code
  end
end
