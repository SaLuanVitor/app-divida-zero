class AddHouseholdRefToFinancialRecords < ActiveRecord::Migration[8.1]
  def change
    add_reference :financial_records, :household, foreign_key: true, null: true
  end
end
