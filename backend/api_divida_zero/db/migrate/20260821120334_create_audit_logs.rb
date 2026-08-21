class CreateAuditLogs < ActiveRecord::Migration[8.1]
  def change
    create_table :audit_logs do |t|
      t.references :user, null: true, foreign_key: true
      t.string :action, null: false
      t.string :resource_type
      t.integer :resource_id
      t.string :ip
      t.text :user_agent
      t.text :metadata

      t.timestamps
    end
    add_index :audit_logs, :action
    add_index :audit_logs, [:resource_type, :resource_id]
    add_index :audit_logs, :created_at
    add_index :audit_logs, [:user_id, :created_at]
  end
end
