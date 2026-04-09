class CreateFinancialGoalContributions < ActiveRecord::Migration[8.1]
  def change
    create_table :financial_goal_contributions do |t|
      t.references :financial_goal, null: false, foreign_key: true
      t.string :kind, null: false
      t.decimal :amount, precision: 12, scale: 2, null: false
      t.text :notes

      t.timestamps
    end

    add_index :financial_goal_contributions, [:financial_goal_id, :created_at], name: "idx_goal_contributions_goal_created_at"
    add_index :financial_goal_contributions, :kind
  end
end
