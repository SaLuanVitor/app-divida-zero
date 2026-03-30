class CreateNotificationAlerts < ActiveRecord::Migration[8.1]
  def change
    create_table :notification_alerts do |t|
      t.references :user, null: false, foreign_key: true
      t.string :alert_type, null: false
      t.string :title, null: false
      t.string :message, null: false
      t.integer :due_count, null: false, default: 0
      t.string :window_key, null: false
      t.json :metadata, null: false, default: {}
      t.datetime :read_at

      t.timestamps
    end

    add_index :notification_alerts, [:user_id, :created_at]
    add_index :notification_alerts, [:user_id, :read_at]
    add_index :notification_alerts, [:user_id, :alert_type, :window_key], unique: true
  end
end

