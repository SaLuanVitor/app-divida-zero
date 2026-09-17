class AddEmailNotificationPreferencesToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :email_notification_preferences, :jsonb, null: false, default: {}
  end
end
