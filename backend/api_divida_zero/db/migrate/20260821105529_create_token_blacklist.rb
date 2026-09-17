class CreateTokenBlacklist < ActiveRecord::Migration[8.1]
  def change
    create_table :token_blacklists do |t|
      t.string :token_digest
      t.datetime :expires_at

      t.timestamps
    end
    add_index :token_blacklists, :token_digest, unique: true
  end
end
