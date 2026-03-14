class CreateFinancialGoals < ActiveRecord::Migration[8.1]
  def change
    create_table :financial_goals do |t|
      t.references :user, null: false, foreign_key: true
      t.string :title, null: false
      t.text :description
      t.decimal :target_amount, precision: 12, scale: 2, null: false
      t.decimal :current_amount, precision: 12, scale: 2, null: false, default: 0
      t.integer :progress_pct, null: false, default: 0
      t.integer :last_awarded_milestone, null: false, default: 0
      t.string :goal_type, null: false
      t.string :status, null: false, default: "active"
      t.date :target_date
      t.datetime :completed_at
      t.timestamps
    end

    add_index :financial_goals, [:user_id, :status]
    add_index :financial_goals, [:user_id, :goal_type]
    add_index :financial_goals, [:user_id, :target_date]
  end
end
