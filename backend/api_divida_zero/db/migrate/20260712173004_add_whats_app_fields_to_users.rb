class AddWhatsAppFieldsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :phone, :string
    add_column :users, :phone_verified, :boolean, default: false, null: false
    add_column :users, :wa_opt_in_at, :datetime
    add_column :users, :wa_notification_preferences, :jsonb, null: false, default: {}
    add_column :users, :wa_consecutive_429_count, :integer, default: 0, null: false
    add_index :users, :phone, unique: true
  end
end
