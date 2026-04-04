class AddReportsPerformanceIndexesToFinancialRecords < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    add_index :financial_records,
      [:user_id, :due_date, :flow_type, :status],
      algorithm: :concurrently,
      name: "index_financial_records_on_user_due_flow_status"

    add_index :financial_records,
      [:user_id, :due_date, :category],
      algorithm: :concurrently,
      name: "index_financial_records_on_user_due_category"
  end
end
