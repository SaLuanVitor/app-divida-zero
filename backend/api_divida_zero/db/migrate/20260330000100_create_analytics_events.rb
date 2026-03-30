class CreateAnalyticsEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :analytics_events do |t|
      t.references :user, null: false, foreign_key: true
      t.string :event_name, null: false
      t.string :screen
      t.string :session_id, null: false
      t.json :metadata, null: false, default: {}

      t.timestamps
    end

    add_index :analytics_events, [:user_id, :created_at]
    add_index :analytics_events, [:user_id, :event_name]
    add_index :analytics_events, :session_id
  end
end
