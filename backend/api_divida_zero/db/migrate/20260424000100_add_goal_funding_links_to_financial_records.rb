class AddGoalFundingLinksToFinancialRecords < ActiveRecord::Migration[8.1]
  def up
    unless table_exists?(:financial_goal_contributions)
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

    unless column_exists?(:financial_records, :financial_goal_id)
      add_reference :financial_records, :financial_goal, foreign_key: true, null: true
    end

    unless column_exists?(:financial_records, :financial_goal_contribution_id)
      add_reference :financial_records, :financial_goal_contribution, foreign_key: true, null: true
    end

    unless index_exists?(:financial_records, :financial_goal_contribution_id, name: "index_financial_records_on_goal_contribution_unique")
      add_index :financial_records,
                :financial_goal_contribution_id,
                unique: true,
                where: "financial_goal_contribution_id IS NOT NULL",
                name: "index_financial_records_on_goal_contribution_unique"
    end
  end

  def down
    if index_exists?(:financial_records, :financial_goal_contribution_id, name: "index_financial_records_on_goal_contribution_unique")
      remove_index :financial_records, name: "index_financial_records_on_goal_contribution_unique"
    end

    remove_reference :financial_records, :financial_goal_contribution, foreign_key: true if column_exists?(:financial_records, :financial_goal_contribution_id)
    remove_reference :financial_records, :financial_goal, foreign_key: true if column_exists?(:financial_records, :financial_goal_id)
  end
end

