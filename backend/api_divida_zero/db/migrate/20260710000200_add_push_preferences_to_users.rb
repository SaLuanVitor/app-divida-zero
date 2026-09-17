class AddPushPreferencesToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :push_preferences, :jsonb, null: false, default: {}
  end
end
