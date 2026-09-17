class AddUserIdToFinancialGoalContributions < ActiveRecord::Migration[8.1]
  def change
    add_reference :financial_goal_contributions, :user, foreign_key: true
  end
end
