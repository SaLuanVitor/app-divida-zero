class AddTelegramFieldsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :telegram_chat_id, :string
    add_column :users, :telegram_username, :string
    add_column :users, :telegram_opt_in_at, :datetime
    add_column :users, :telegram_notification_preferences, :jsonb, null: false, default: {}
    add_index :users, :telegram_chat_id, unique: true
  end
end
