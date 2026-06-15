class AddAdminControlFieldsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :role, :string, null: false, default: "user"
    add_column :users, :active, :boolean, null: false, default: true
    add_column :users, :force_password_change, :boolean, null: false, default: false
    add_column :users, :last_login_at, :datetime

    add_index :users, :role
    add_index :users, :active
  end
end
