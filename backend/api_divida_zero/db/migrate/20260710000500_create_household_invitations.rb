class CreateHouseholdInvitations < ActiveRecord::Migration[8.1]
  def change
    create_table :household_invitations do |t|
      t.references :household, null: false, foreign_key: true
      t.string :email, null: false
      t.string :token, null: false
      t.string :status, null: false, default: "pending"
      t.references :invited_by, null: false, foreign_key: { to_table: :users }
      t.datetime :expires_at, null: false

      t.timestamps
    end

    add_index :household_invitations, :token, unique: true
  end
end
