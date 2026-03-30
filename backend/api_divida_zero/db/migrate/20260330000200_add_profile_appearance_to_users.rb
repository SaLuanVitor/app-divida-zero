class AddProfileAppearanceToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :profile_icon_key, :string, null: false, default: "icon_01"
    add_column :users, :profile_frame_key, :string, null: false, default: "frame_01"
  end
end
