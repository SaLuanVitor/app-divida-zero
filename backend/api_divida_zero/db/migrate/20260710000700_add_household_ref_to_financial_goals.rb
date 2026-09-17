class AddHouseholdRefToFinancialGoals < ActiveRecord::Migration[8.1]
  def change
    add_reference :financial_goals, :household, foreign_key: true, null: true
  end
end
