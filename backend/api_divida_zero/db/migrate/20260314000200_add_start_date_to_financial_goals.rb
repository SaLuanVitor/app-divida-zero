class AddStartDateToFinancialGoals < ActiveRecord::Migration[8.1]
  def up
    add_column :financial_goals, :start_date, :date

    execute <<~SQL
      UPDATE financial_goals
      SET start_date = DATE(created_at)
      WHERE start_date IS NULL
    SQL

    change_column_null :financial_goals, :start_date, false
    add_index :financial_goals, [:user_id, :start_date]
  end

  def down
    remove_index :financial_goals, column: [:user_id, :start_date]
    remove_column :financial_goals, :start_date
  end
end
